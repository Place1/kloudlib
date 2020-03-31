
# Interface: PrometheusInputs

## Properties

### `Optional` namespace

• **namespace**? : *pulumi.Input‹string›*

*Defined in [prometheus/index.ts:20](https://github.com/Place1/kloudlib/blob/27a9d16/packages/prometheus/index.ts#L20)*

___

### `Optional` persistence

• **persistence**? : *abstractions.Persistence*

*Defined in [prometheus/index.ts:30](https://github.com/Place1/kloudlib/blob/27a9d16/packages/prometheus/index.ts#L30)*

___

### `Optional` provider

• **provider**? : *k8s.Provider*

*Defined in [prometheus/index.ts:19](https://github.com/Place1/kloudlib/blob/27a9d16/packages/prometheus/index.ts#L19)*

___

### `Optional` resources

• **resources**? : *abstractions.ComputeResources*

*Defined in [prometheus/index.ts:31](https://github.com/Place1/kloudlib/blob/27a9d16/packages/prometheus/index.ts#L31)*

___

### `Optional` retentionHours

• **retentionHours**? : *undefined | number*

the retention time for recorded metrics in hours
defaults to 7 days

*Defined in [prometheus/index.ts:29](https://github.com/Place1/kloudlib/blob/27a9d16/packages/prometheus/index.ts#L29)*

___

### `Optional` version

• **version**? : *undefined | string*

the helm chart version

*Defined in [prometheus/index.ts:24](https://github.com/Place1/kloudlib/blob/27a9d16/packages/prometheus/index.ts#L24)*
