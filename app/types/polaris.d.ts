/**
 * Polaris Web Component Type Definitions
 * These types enable TypeScript IntelliSense for Shopify Polaris web components
 */

import type * as React from 'react';

declare global {
  namespace JSX {
  interface IntrinsicElements {
    's-page': {
      title?: string;
      heading?: string;
      primaryAction?: unknown;
      children?: React.ReactNode;
    };

    's-layout': {
      children?: React.ReactNode;
    };

    's-layout-section': {
      children?: React.ReactNode;
    };

    's-card': {
      title?: string;
      sectioned?: boolean;
      children?: React.ReactNode;
    };

    's-stack': {
      gap?: string;
      vertical?: boolean;
      direction?: string;
      children?: React.ReactNode;
    };

    's-text': {
      variant?: 'headingSm' | 'headingMd' | 'headingLg' | 'bodyMd' | 'bodySm';
      as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
      children?: React.ReactNode;
    };

    's-text-field': {
      label?: string;
      value?: string;
      onInput?: (e: Event) => void;
      onChange?: (e: Event) => void;
      multiline?: string | boolean;
      autoComplete?: string;
      autocomplete?: string;
      placeholder?: string;
      helpText?: string;
      details?: string;
      error?: string;
      name?: string;
      suffix?: string;
    };

    's-button': {
      variant?: 'primary' | 'secondary' | 'plain' | 'destructive' | 'tertiary';
      size?: 'slim' | 'medium' | 'large';
      loading?: string | boolean;
      disabled?: boolean;
      onClick?: () => void;
      submit?: boolean;
      slot?: string;
      target?: string;
      type?: string;
      children?: React.ReactNode;
    };

    's-select': {
      label?: string;
      value?: string;
      onChange?: (e: Event) => void;
      options?: Array<{ label: string; value: string }>;
      children?: React.ReactNode;
    };

    's-option': {
      value: string;
      key?: string;
      children?: React.ReactNode;
    };

    's-banner': {
      tone?: 'info' | 'success' | 'warning' | 'critical';
      heading?: string;
      dismissible?: boolean;
      onDismiss?: () => void;
      children?: React.ReactNode;
    };

    's-box': {
      padding?: string;
      background?: string;
      borderWidth?: string;
      borderRadius?: string;
      children?: React.ReactNode;
    };

    'ui-nav-menu': {
      children?: React.ReactNode;
    };

    'ui-title-bar': {
      title?: string;
      children?: React.ReactNode;
    };

    's-link': {
      href?: string;
      target?: string;
      rel?: string;
      children?: React.ReactNode;
    };

    's-section': {
      heading?: string;
      slot?: string;
      children?: React.ReactNode;
    };

    's-paragraph': {
      children?: React.ReactNode;
    };

    's-heading': {
      variant?: 'headingSm' | 'headingMd' | 'headingLg' | 'headingXl';
      as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      children?: React.ReactNode;
    };

    's-list-item': {
      children?: React.ReactNode;
    };

    's-unordered-list': {
      children?: React.ReactNode;
    };
  }
  }
}
