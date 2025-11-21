declare module "*.css";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "s-page": any;
      "s-layout": any;
      "s-layout-section": any;
      "s-card": any;
      "s-stack": any;
      "s-text": any;
      "s-text-field": any;
      "s-button": any;
      "s-banner": any;
      "s-box": any;
      "s-select": any;
      "s-option": any;
      "s-link": any;
      "ui-nav-menu": any;
      "ui-title-bar": any;
    }
  }
}
