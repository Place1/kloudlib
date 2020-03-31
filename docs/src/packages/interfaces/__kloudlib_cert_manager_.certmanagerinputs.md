
# Interface: CertManagerInputs

## Properties

### `Optional` acme

• **acme**? : *undefined | object*

configure acme settings

*Defined in [cert-manager/index.ts:40](https://github.com/Place1/kloudlib/blob/27a9d16/packages/cert-manager/index.ts#L40)*

___

### `Optional` namespace

• **namespace**? : *pulumi.Input‹string›*

*Defined in [cert-manager/index.ts:26](https://github.com/Place1/kloudlib/blob/27a9d16/packages/cert-manager/index.ts#L26)*

___

### `Optional` provider

• **provider**? : *k8s.Provider*

*Defined in [cert-manager/index.ts:25](https://github.com/Place1/kloudlib/blob/27a9d16/packages/cert-manager/index.ts#L25)*

___

### `Optional` useStagingACME

• **useStagingACME**? : *undefined | false | true*

if true then the staging ACME api will be used
rather than the production ACME api.
defaults to true

*Defined in [cert-manager/index.ts:36](https://github.com/Place1/kloudlib/blob/27a9d16/packages/cert-manager/index.ts#L36)*

___

### `Optional` version

• **version**? : *undefined | string*

the helm chart version

*Defined in [cert-manager/index.ts:30](https://github.com/Place1/kloudlib/blob/27a9d16/packages/cert-manager/index.ts#L30)*
