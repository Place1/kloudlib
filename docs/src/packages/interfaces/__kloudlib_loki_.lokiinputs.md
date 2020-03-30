
# Interface: LokiInputs

## Properties

### `Optional` namespace

• **namespace**? : *pulumi.Input‹string›*

*Defined in [loki/index.ts:21](https://github.com/Place1/kloudlib/blob/27a9d16/packages/loki/index.ts#L21)*

___

### `Optional` persistence

• **persistence**? : *abstractions.Persistence*

Data persistence for loki's log database

*Defined in [loki/index.ts:34](https://github.com/Place1/kloudlib/blob/27a9d16/packages/loki/index.ts#L34)*

___

### `Optional` provider

• **provider**? : *k8s.Provider*

*Defined in [loki/index.ts:20](https://github.com/Place1/kloudlib/blob/27a9d16/packages/loki/index.ts#L20)*

___

### `Optional` retentionHours

• **retentionHours**? : *undefined | number*

the retention time for recorded logs in hours
defaults to 7 days

*Defined in [loki/index.ts:30](https://github.com/Place1/kloudlib/blob/27a9d16/packages/loki/index.ts#L30)*

___

### `Optional` version

• **version**? : *undefined | string*

the helm chart version

*Defined in [loki/index.ts:25](https://github.com/Place1/kloudlib/blob/27a9d16/packages/loki/index.ts#L25)*
