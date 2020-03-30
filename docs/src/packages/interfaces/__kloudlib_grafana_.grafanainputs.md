
# Interface: GrafanaInputs

## Properties

### `Optional` dashboards

• **dashboards**? : *Array‹[GrafanaDashboard](../modules/__kloudlib_grafana_.md#grafanadashboard)›*

import dasboards into grafana.
defaults to undefined.

*Defined in [grafana/index.ts:31](https://github.com/Place1/kloudlib/blob/27a9d16/packages/grafana/index.ts#L31)*

___

### `Optional` datasources

• **datasources**? : *[GrafanaDataSource](__kloudlib_grafana_.grafanadatasource.md)[]*

grafana datasources

*Defined in [grafana/index.ts:35](https://github.com/Place1/kloudlib/blob/27a9d16/packages/grafana/index.ts#L35)*

___

### `Optional` ingress

• **ingress**? : *abstractions.Ingress*

ingress resource configuration
defaults to undefined (no ingress resource will be created)

*Defined in [grafana/index.ts:40](https://github.com/Place1/kloudlib/blob/27a9d16/packages/grafana/index.ts#L40)*

___

### `Optional` namespace

• **namespace**? : *pulumi.Input‹string›*

*Defined in [grafana/index.ts:22](https://github.com/Place1/kloudlib/blob/27a9d16/packages/grafana/index.ts#L22)*

___

### `Optional` persistence

• **persistence**? : *abstractions.Persistence*

persistent storage configuration
defaults to undefined (no persistent storage will be used)

*Defined in [grafana/index.ts:45](https://github.com/Place1/kloudlib/blob/27a9d16/packages/grafana/index.ts#L45)*

___

### `Optional` provider

• **provider**? : *k8s.Provider*

*Defined in [grafana/index.ts:21](https://github.com/Place1/kloudlib/blob/27a9d16/packages/grafana/index.ts#L21)*

___

### `Optional` version

• **version**? : *undefined | string*

the helm chart version

*Defined in [grafana/index.ts:26](https://github.com/Place1/kloudlib/blob/27a9d16/packages/grafana/index.ts#L26)*
