# Grafana

## Inputs

| name        | type                     | description                                                                                 | required |
| ----------- | ------------------------ | ------------------------------------------------------------------------------------------- | -------- |
| provider    | k8s.Provider             |                                                                                             | yes      |
| namespace   | pulumi.Input<string>     |                                                                                             | yes      |
| version     | string                   | the helm chart version                                                                      | yes      |
| dashboards  | Array<GrafanaDashboard>  | import dasboards into grafana. defaults to undefined.                                       | yes      |
| datasources | GrafanaDataSource[]      | grafana datasources                                                                         | yes      |
| ingress     | abstractions.Ingress     | ingress resource configuration defaults to undefined (no ingress resource will be created)  | yes      |
| persistence | abstractions.Persistence | persistent storage configuration defaults to undefined (no persistent storage will be used) | yes      |

## Outputs

| name          | type                                                | description | required |
| ------------- | --------------------------------------------------- | ----------- | -------- |
| meta          | pulumi.Output<abstractions.HelmMeta>                |             | no       |
| adminUsername | pulumi.Output<string>                               |             | no       |
| adminPassword | pulumi.Output<string>                               |             | no       |
| ingress       | pulumi.Output<abstractions.Ingress | undefined>     |             | no       |
| persistence   | pulumi.Output<abstractions.Persistence | undefined> |             | no       |