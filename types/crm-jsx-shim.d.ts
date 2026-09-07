// The embedded CRM prototype was written for React 18, which exposed a global
// `JSX` namespace (e.g. `JSX.Element`). React 19's types moved this under
// `React.JSX`, so the prototype's references fail to resolve in this host.
// This shim re-exposes the global `JSX` namespace by mapping it to React's,
// fixing the whole prototype at once without editing its source.
import type * as React from 'react';

declare global {
  namespace JSX {
    interface Element extends React.JSX.Element {}
    interface ElementClass extends React.JSX.ElementClass {}
    interface ElementAttributesProperty extends React.JSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute extends React.JSX.ElementChildrenAttribute {}
    type ElementType = React.JSX.ElementType;
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
    interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
    interface IntrinsicClassAttributes<T> extends React.JSX.IntrinsicClassAttributes<T> {}
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}

export {};
