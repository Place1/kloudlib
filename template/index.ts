/**
 * @module "@kloudlib/prometheus"
 * @packageDocumentation
 * @example
 * ```typescript
 * import { MyComponent } from '@kloudlib/my-component';
 *
 * new MyComponent('my-component', {
 *   // ...
 * });
 * ```
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as abstractions from '@kloudlib/abstractions';

export interface MyComponentInputs {
  /**
   * The pulumi kubernetes provider
   */
  provider?: k8s.Provider;
  /**
   * A kubernetes namespace. If present, this will override
   * the given provider's namespace.
   */
  namespace?: pulumi.Input<string>;
}

export interface MyComponentOutputs {

}

/**
 * @noInheritDoc
 */
export class MyComponent extends pulumi.ComponentResource implements MyComponentOutputs {

  constructor(name: string, props?: MyComponentInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:MyComponent', name, props, opts);
  }

}
