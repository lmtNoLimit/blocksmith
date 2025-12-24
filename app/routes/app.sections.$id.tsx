import { useEffect, useCallback, useState, useRef } from 'react';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
  data,
} from 'react-router';
import { authenticate } from '../shopify.server';
import { themeAdapter } from '../services/adapters/theme-adapter';
import { sectionService } from '../services/section.server';
import { chatService } from '../services/chat.server';
import prisma from '../db.server';

import {
  PolarisEditorLayout,
  ChatPanelWrapper,
  CodePreviewPanel,
  PreviewSettingsPanel,
  PublishModal,
  PUBLISH_MODAL_ID,
  useEditorState,
} from '../components/editor';
import { usePreviewSettings } from '../components/preview';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import type { DeviceSize } from '../components/preview/types';

import type { SaveActionData, Theme, UIMessage } from '../types';
import { SECTION_STATUS } from '../types/section-status';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const sectionId = params.id;

  if (!sectionId) {
    throw data({ message: 'Section ID required' }, { status: 400 });
  }

  // Load section
  const section = await sectionService.getById(sectionId, shop);
  if (!section) {
    throw data({ message: 'Section not found' }, { status: 404 });
  }

  // Load themes
  const themes = await themeAdapter.getThemes(request);

  // Load or create conversation
  const conversation = await chatService.getOrCreateConversation(sectionId, shop);
  const messages = await chatService.getMessages(conversation.id);

  return {
    section,
    themes,
    conversation: {
      id: conversation.id,
      messages,
    },
    shopDomain: shop,
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const sectionId = params.id!;

  const formData = await request.formData();
  const actionType = formData.get('action');

  if (actionType === 'saveDraft') {
    const code = formData.get('code') as string;
    const name = formData.get('name') as string;

    try {
      await sectionService.update(sectionId, shop, {
        name,
        status: SECTION_STATUS.DRAFT,
      });

      await prisma.section.update({
        where: { id: sectionId },
        data: { code },
      });

      return { success: true, message: 'Draft saved!' } satisfies SaveActionData;
    } catch (error) {
      console.error('Failed to save draft:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save draft.',
      } satisfies SaveActionData;
    }
  }

  if (actionType === 'publish') {
    const code = formData.get('code') as string;
    const name = formData.get('name') as string;
    const themeId = formData.get('themeId') as string;
    const fileName = formData.get('fileName') as string;
    const themeName = formData.get('themeName') as string;

    try {
      // Save to theme
      await themeAdapter.createSection(request, themeId, fileName, code, name);

      // Update section
      await sectionService.update(sectionId, shop, {
        name,
        status: SECTION_STATUS.ACTIVE,
        themeId,
        themeName,
        fileName,
      });

      await prisma.section.update({
        where: { id: sectionId },
        data: { code },
      });

      return {
        success: true,
        message: `Published to ${fileName}!`,
      } satisfies SaveActionData;
    } catch (error) {
      console.error('Failed to publish:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to publish.',
      } satisfies SaveActionData;
    }
  }

  if (actionType === 'updateName') {
    const name = formData.get('name') as string;
    await sectionService.update(sectionId, shop, { name });
    return { success: true };
  }

  if (actionType === 'archive') {
    try {
      await sectionService.archive(sectionId, shop);
      return {
        success: true,
        message: 'Section archived.',
        redirect: '/app/sections?view=archive',
      } satisfies SaveActionData;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to archive.',
      } satisfies SaveActionData;
    }
  }

  if (actionType === 'deactivate') {
    try {
      await sectionService.update(sectionId, shop, {
        status: SECTION_STATUS.INACTIVE,
      });
      return {
        success: true,
        message: 'Section deactivated.',
        redirect: '/app/sections?view=inactive',
      } satisfies SaveActionData;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to deactivate.',
      } satisfies SaveActionData;
    }
  }

  if (actionType === 'restore') {
    try {
      await sectionService.update(sectionId, shop, {
        status: SECTION_STATUS.DRAFT,
      });
      return {
        success: true,
        message: 'Section restored to draft.',
      } satisfies SaveActionData;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to restore.',
      } satisfies SaveActionData;
    }
  }

  return data({ error: 'Unknown action' }, { status: 400 });
}

export default function UnifiedEditorPage() {
  const { section, themes, conversation, shopDomain } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const {
    sectionCode,
    sectionName,
    setSectionName,
    handleCodeUpdate,
    lastCodeSource,
    revertToOriginal,
    canRevert,
    conversationId,
    initialMessages,
    selectedTheme,
    setSelectedTheme,
    selectedThemeName,
    fileName,
    setFileName,
    isDirty,
    canPublish,
    // Version state
    versions,
    selectedVersionId,
    activeVersionId,
    previewCode,
    selectVersion,
    applyVersion,
  } = useEditorState({
    section,
    themes: themes as Theme[],
    conversation: conversation as { id: string; messages: UIMessage[] },
  });

  // Preview settings hook - manages schema-based settings for right panel
  const previewSettings = usePreviewSettings(previewCode);

  // Device size state for preview panel header
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const [isRendering, setIsRendering] = useState(false);
  const refreshRef = useRef<(() => void) | null>(null);

  // Inline name editing state
  const [editedName, setEditedName] = useState(sectionName);
  // Web component refs - using any because s-* components don't have proper TS types
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const renameModalRef = useRef<any>(null);
  const renameModalTriggerRef = useRef<any>(null);
  const nameInputRef = useRef<any>(null);
  const confirmVersionModalRef = useRef<any>(null);
  const confirmVersionTriggerRef = useRef<any>(null);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // State for version apply confirmation
  const [pendingVersionApply, setPendingVersionApply] = useState<string | null>(null);

  // Sync editedName when sectionName changes
  useEffect(() => {
    setEditedName(sectionName);
  }, [sectionName]);

  // Open rename modal programmatically
  const openRenameModal = useCallback(() => {
    renameModalTriggerRef.current?.click();
  }, []);

  const isLoading = navigation.state === 'submitting';
  const isSavingDraft = isLoading && navigation.formData?.get('action') === 'saveDraft';
  const isPublishing = isLoading && navigation.formData?.get('action') === 'publish';

  // Save handlers
  const handleSaveDraft = useCallback(() => {
    if (isLoading) return;
    const formData = new FormData();
    formData.append('action', 'saveDraft');
    formData.append('code', sectionCode);
    formData.append('name', sectionName);
    submit(formData, { method: 'post' });
  }, [isLoading, sectionCode, sectionName, submit]);

  const handlePublish = useCallback(() => {
    if (isLoading || !canPublish) return;
    const formData = new FormData();
    formData.append('action', 'publish');
    formData.append('code', sectionCode);
    formData.append('name', sectionName);
    formData.append('themeId', selectedTheme);
    formData.append('fileName', fileName);
    formData.append('themeName', selectedThemeName);
    submit(formData, { method: 'post' });
  }, [isLoading, canPublish, sectionCode, sectionName, selectedTheme, fileName, selectedThemeName, submit]);

  // Handle version apply with confirmation if draft is dirty
  const handleVersionApply = useCallback((versionId: string) => {
    if (isDirty) {
      // Show confirmation modal
      setPendingVersionApply(versionId);
      confirmVersionTriggerRef.current?.click();
    } else {
      // Apply directly
      applyVersion(versionId);
      shopify.toast.show('Version applied to draft');
    }
  }, [isDirty, applyVersion]);

  // Confirm version apply
  const confirmVersionApply = useCallback(() => {
    if (pendingVersionApply) {
      applyVersion(pendingVersionApply);
      shopify.toast.show('Version applied to draft');
      setPendingVersionApply(null);
      confirmVersionModalRef.current?.hideOverlay?.();
    }
  }, [pendingVersionApply, applyVersion]);

  // Cancel version apply
  const cancelVersionApply = useCallback(() => {
    setPendingVersionApply(null);
    confirmVersionModalRef.current?.hideOverlay?.();
  }, []);

  // Handle refresh from preview header
  const handleRefresh = useCallback(() => {
    refreshRef.current?.();
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 's',
        ctrl: true,
        action: handleSaveDraft,
        description: 'Save draft',
      },
      {
        key: 's',
        ctrl: true,
        shift: true,
        action: handlePublish,
        description: 'Publish to theme',
        enabled: canPublish,
      },
      {
        key: 'r',
        ctrl: true,
        action: handleRefresh,
        description: 'Refresh preview',
      },
    ],
  });

  const handleNameChange = useCallback((name: string) => {
    setSectionName(name);
    const formData = new FormData();
    formData.append('action', 'updateName');
    formData.append('name', name);
    submit(formData, { method: 'post' });
  }, [setSectionName, submit]);

  const handleNameSubmit = useCallback(() => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== sectionName) {
      handleNameChange(trimmedName);
    } else {
      setEditedName(sectionName);
    }
    // Close modal using method
    renameModalRef.current?.hideOverlay?.();
  }, [editedName, sectionName, handleNameChange]);

  const handleNameInputChange = useCallback((e: Event) => {
    const target = e.target as HTMLElement & { value?: string };
    if (target?.value !== undefined) {
      setEditedName(target.value);
    }
  }, []);

  const handleCancelRename = useCallback(() => {
    setEditedName(sectionName);
    renameModalRef.current?.hideOverlay?.();
  }, [sectionName]);

  // Show toast on success and handle redirects
  useEffect(() => {
    if (actionData && 'success' in actionData && actionData.success) {
      if ('message' in actionData && actionData.message) {
        shopify.toast.show(actionData.message);
      }
      if ('redirect' in actionData && actionData.redirect) {
        window.location.href = actionData.redirect;
      }
    }
  }, [actionData]);

  // Display title with dirty indicator and AI badge
  const displayTitle = `${sectionName}${isDirty ? ' *' : ''}`;

  return (
    <s-page heading={displayTitle} inlineSize="large">
      {/* Breadcrumb - back to sections */}
      <s-link slot="breadcrumb-actions" href="/app/sections">
        Sections
      </s-link>

      {/* Primary action - Publish button triggers modal via commandFor */}
      <s-button
        slot="primary-action"
        variant="primary"
        commandFor={PUBLISH_MODAL_ID}
        command="--show"
        loading={isPublishing || undefined}
        disabled={isLoading || undefined}
      >
        Publish
      </s-button>

      {/* Publish Modal - triggered by primary action button */}
      <PublishModal
        themes={themes as Theme[]}
        selectedTheme={selectedTheme}
        onThemeChange={setSelectedTheme}
        fileName={fileName}
        onFileNameChange={setFileName}
        selectedThemeName={selectedThemeName}
        onPublish={handlePublish}
        isPublishing={isPublishing}
        canPublish={canPublish && !isLoading}
      />

      {/* Secondary actions */}
      <s-button
        slot="secondary-actions"
        onClick={handleSaveDraft}
        loading={isSavingDraft || undefined}
        disabled={isLoading || undefined}
      >
        Save Draft
      </s-button>

      {canRevert && (
        <s-button
          slot="secondary-actions"
          onClick={revertToOriginal}
          disabled={isLoading || undefined}
        >
          Revert
        </s-button>
      )}

      {/* More actions menu */}
      <s-button slot="secondary-actions" commandFor="editor-more-actions">
        More actions
      </s-button>
      <s-menu id="editor-more-actions">
        <s-button onClick={openRenameModal}>Rename</s-button>
        {lastCodeSource === 'chat' && (
          <s-badge tone="info">AI updated</s-badge>
        )}
      </s-menu>

      {/* Hidden trigger for rename modal */}
      <div style={{ display: 'none' }}>
        <s-button
          ref={renameModalTriggerRef}
          commandFor="rename-modal"
          command="--show"
        />
      </div>

      {/* Rename Modal */}
      <s-modal ref={renameModalRef} id="rename-modal" heading="Rename section">
        <s-text-field
          ref={nameInputRef}
          label="Section name"
          value={editedName}
          onInput={handleNameInputChange}
        />

        <s-button
          slot="secondary-actions"
          commandFor="rename-modal"
          command="--hide"
          onClick={handleCancelRename}
        >
          Cancel
        </s-button>
        <s-button
          slot="primary-action"
          variant="primary"
          onClick={handleNameSubmit}
        >
          Save
        </s-button>
      </s-modal>

      {/* Hidden trigger for confirm version modal */}
      <div style={{ display: 'none' }}>
        <s-button
          ref={confirmVersionTriggerRef}
          commandFor="confirm-version-modal"
          command="--show"
        />
      </div>

      {/* Confirm Version Apply Modal */}
      <s-modal
        ref={confirmVersionModalRef}
        id="confirm-version-modal"
        heading="Apply this version?"
      >
        <s-text>
          You have unsaved changes to your draft. Applying this version will
          replace your current work.
        </s-text>

        <s-button
          slot="secondary-actions"
          commandFor="confirm-version-modal"
          command="--hide"
          onClick={cancelVersionApply}
        >
          Cancel
        </s-button>
        <s-button
          slot="primary-action"
          variant="primary"
          onClick={confirmVersionApply}
        >
          Apply version
        </s-button>
      </s-modal>

      <PolarisEditorLayout
        chatPanel={
          conversationId ? (
            <ChatPanelWrapper
              conversationId={conversationId}
              initialMessages={initialMessages}
              currentCode={sectionCode}
              onCodeUpdate={handleCodeUpdate}
              versions={versions}
              selectedVersionId={selectedVersionId}
              activeVersionId={activeVersionId}
              onVersionSelect={selectVersion}
              onVersionApply={handleVersionApply}
            />
          ) : (
            <s-box padding="base">
              <s-stack gap="base" alignItems="center">
                <s-heading>AI Assistant</s-heading>
                <s-text color="subdued">Loading conversation...</s-text>
              </s-stack>
            </s-box>
          )
        }
        codePreviewPanel={
          <CodePreviewPanel
            code={previewCode}
            fileName={fileName}
            isViewingHistory={selectedVersionId !== null}
            versionNumber={versions.find((v) => v.id === selectedVersionId)?.versionNumber}
            onReturnToCurrent={() => selectVersion(null)}
            deviceSize={deviceSize}
            onDeviceSizeChange={setDeviceSize}
            onRefresh={handleRefresh}
            isRendering={isRendering}
            // Pass preview settings for SectionPreview
            settingsValues={previewSettings.settingsValues}
            blocksState={previewSettings.blocksState}
            loadedResources={previewSettings.loadedResources}
            onRenderStateChange={setIsRendering}
            onRefreshRef={refreshRef}
            shopDomain={shopDomain}
          />
        }
        settingsPanel={
          <PreviewSettingsPanel
            settings={previewSettings.schemaSettings}
            values={previewSettings.settingsValues}
            onChange={previewSettings.setSettingsValues}
            schema={previewSettings.parsedSchema}
            blocks={previewSettings.blocksState}
            onBlockSettingChange={previewSettings.handleBlockSettingChange}
            resourceSettings={previewSettings.resourceSelections}
            onResourceSelect={previewSettings.handleResourceSelect}
            isLoadingResource={previewSettings.isLoadingResource}
            disabled={isLoading}
          />
        }
      />
    </s-page>
  );
}

// Error boundary for 404
export function ErrorBoundary() {
  return (
    <s-page heading="Section Not Found" inlineSize="large">
      <s-stack gap="large" direction="block" alignItems="center">
        <s-section>
          <s-stack gap="base" alignItems="center">
            <s-heading>Section not found</s-heading>
            <s-paragraph>
              The section you are looking for does not exist or you do not have
              access to it.
            </s-paragraph>
            <s-button
              variant="primary"
              onClick={() => (window.location.href = '/app/sections')}
            >
              Back to Sections
            </s-button>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}
