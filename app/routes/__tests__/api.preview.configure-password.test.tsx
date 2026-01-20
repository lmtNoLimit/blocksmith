/**
 * Tests for /api/preview/configure-password route
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { action, loader } from "../api.preview.configure-password";
import * as shopifyAuth from "../../shopify.server";
import * as storefrontAuth from "../../services/storefront-auth.server";

// Mock dependencies
jest.mock("../../shopify.server", () => ({
  authenticate: {
    admin: jest.fn(),
  },
}));

jest.mock("../../services/storefront-auth.server", () => ({
  validateAndSaveStorefrontPassword: jest.fn(),
}));

describe("api.preview.configure-password route", () => {
  const mockSession = {
    shop: "test-shop.myshopify.com",
  };

  let mockRequest: any;
  let mockFormData: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock FormData
    mockFormData = {
      get: jest.fn((key) => {
        const data: Record<string, any> = {
          password: "test-password-123",
        };
        return data[key] || null;
      }),
    };

    // Setup mock request
    mockRequest = {
      method: "POST",
      formData: jest.fn().mockResolvedValue(mockFormData),
    };

    // Setup default auth mock
    (shopifyAuth.authenticate.admin as jest.Mock).mockResolvedValue({
      session: mockSession,
    });

    // Setup default service mock
    (
      storefrontAuth.validateAndSaveStorefrontPassword as jest.Mock
    ).mockResolvedValue({
      success: true,
    });
  });

  describe("loader", () => {
    it("should return 405 Method Not Allowed", async () => {
      const result = await loader();

      expect((result as any).init.status).toBe(405);
      expect((result as any).data).toHaveProperty("error", "Method not allowed");
    });
  });

  describe("action - authentication", () => {
    it("should require authentication", async () => {
      await action({ request: mockRequest } as any);

      expect(shopifyAuth.authenticate.admin).toHaveBeenCalledWith(mockRequest);
    });

    it("should return 401 when session is missing", async () => {
      (shopifyAuth.authenticate.admin as jest.Mock).mockResolvedValue({
        session: null,
      });

      const result = await action({ request: mockRequest } as any);

      expect((result as any).init.status).toBe(401);
      expect((result as any).data).toHaveProperty("error", "Unauthorized");
    });

    it("should throw when authentication fails", async () => {
      (shopifyAuth.authenticate.admin as jest.Mock).mockRejectedValue(
        new Error("Not authenticated")
      );

      await expect(action({ request: mockRequest } as any)).rejects.toThrow();
    });
  });

  describe("action - method validation", () => {
    it("should accept POST requests", async () => {
      mockRequest.method = "POST";

      const result = await action({ request: mockRequest } as any);

      expect((result as any).data.success).toBe(true);
    });

    it("should reject GET requests with 405", async () => {
      mockRequest.method = "GET";

      const result = await action({ request: mockRequest } as any);

      expect((result as any).init.status).toBe(405);
      expect((result as any).data).toHaveProperty("error", "Method not allowed");
    });

    it("should reject PUT requests with 405", async () => {
      mockRequest.method = "PUT";

      const result = await action({ request: mockRequest } as any);

      expect((result as any).init.status).toBe(405);
    });

    it("should reject DELETE requests with 405", async () => {
      mockRequest.method = "DELETE";

      const result = await action({ request: mockRequest } as any);

      expect((result as any).init.status).toBe(405);
    });
  });

  describe("action - input validation", () => {
    it("should return 400 when password is missing", async () => {
      mockFormData.get = jest.fn().mockReturnValue(null);

      const result = await action({ request: mockRequest } as any);

      expect((result as any).init.status).toBe(400);
      expect((result as any).data).toHaveProperty("error", "Password is required");
    });

    it("should return 400 when password is empty string", async () => {
      mockFormData.get = jest.fn().mockReturnValue("");

      const result = await action({ request: mockRequest } as any);

      expect((result as any).init.status).toBe(400);
      expect((result as any).data).toHaveProperty("error", "Password is required");
    });

    it("should extract password from form data", async () => {
      await action({ request: mockRequest } as any);

      expect(mockFormData.get).toHaveBeenCalledWith("password");
    });
  });

  describe("action - password validation and save", () => {
    it("should call validateAndSaveStorefrontPassword with shop and password", async () => {
      mockFormData.get = jest.fn().mockReturnValue("my-store-password");

      await action({ request: mockRequest } as any);

      expect(
        storefrontAuth.validateAndSaveStorefrontPassword
      ).toHaveBeenCalledWith(mockSession.shop, "my-store-password");
    });

    it("should return success when password is valid and saved", async () => {
      (
        storefrontAuth.validateAndSaveStorefrontPassword as jest.Mock
      ).mockResolvedValue({
        success: true,
      });

      const result = await action({ request: mockRequest } as any);

      expect((result as any).data).toEqual({ success: true });
    });

    it("should return 400 with error when password is invalid", async () => {
      (
        storefrontAuth.validateAndSaveStorefrontPassword as jest.Mock
      ).mockResolvedValue({
        success: false,
        error: "Invalid storefront password",
      });

      const result = await action({ request: mockRequest } as any);

      expect((result as any).init.status).toBe(400);
      expect((result as any).data).toEqual({
        success: false,
        error: "Invalid storefront password",
      });
    });

    it("should return default error message when service returns no error", async () => {
      (
        storefrontAuth.validateAndSaveStorefrontPassword as jest.Mock
      ).mockResolvedValue({
        success: false,
      });

      const result = await action({ request: mockRequest } as any);

      expect((result as any).init.status).toBe(400);
      expect((result as any).data).toHaveProperty("error", "Invalid password");
    });
  });

  describe("action - error handling", () => {
    it("should return 500 when service throws", async () => {
      (
        storefrontAuth.validateAndSaveStorefrontPassword as jest.Mock
      ).mockRejectedValue(new Error("Database connection failed"));

      const result = await action({ request: mockRequest } as any);

      expect((result as any).init.status).toBe(500);
      expect((result as any).data).toEqual({
        success: false,
        error: "Failed to save password",
      });
    });

    it("should not crash on formData errors", async () => {
      mockRequest.formData = jest
        .fn()
        .mockRejectedValue(new Error("Invalid form data"));

      const result = await action({ request: mockRequest } as any);

      expect((result as any).init.status).toBe(500);
    });
  });

  describe("action - security", () => {
    it("should not expose password in response on success", async () => {
      const result = await action({ request: mockRequest } as any);

      const responseData = (result as any).data;
      expect(responseData).not.toHaveProperty("password");
      expect(JSON.stringify(responseData)).not.toContain("test-password-123");
    });

    it("should not expose password in response on error", async () => {
      (
        storefrontAuth.validateAndSaveStorefrontPassword as jest.Mock
      ).mockResolvedValue({
        success: false,
        error: "Invalid password",
      });

      const result = await action({ request: mockRequest } as any);

      const responseData = (result as any).data;
      expect(responseData).not.toHaveProperty("password");
    });

    it("should use shop from authenticated session, not from request", async () => {
      // Even if malicious user tries to pass different shop in form data
      mockFormData.get = jest.fn((key) => {
        const data: Record<string, any> = {
          password: "test-password",
          shop: "malicious-shop.myshopify.com", // Attempt to override
        };
        return data[key] || null;
      });

      await action({ request: mockRequest } as any);

      expect(
        storefrontAuth.validateAndSaveStorefrontPassword
      ).toHaveBeenCalledWith(
        mockSession.shop, // Should use session shop, not form data
        "test-password"
      );
    });
  });

  describe("action - response format", () => {
    it("should return JSON with success: true on success", async () => {
      const result = await action({ request: mockRequest } as any);

      expect((result as any).data).toMatchObject({ success: true });
    });

    it("should return JSON with success: false and error on failure", async () => {
      (
        storefrontAuth.validateAndSaveStorefrontPassword as jest.Mock
      ).mockResolvedValue({
        success: false,
        error: "Test error message",
      });

      const result = await action({ request: mockRequest } as any);

      expect((result as any).data).toMatchObject({
        success: false,
        error: "Test error message",
      });
    });
  });
});
