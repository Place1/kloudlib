# GrafanaStack

## Inputs

| name       | type                                                 | description | required |
| ---------- | ---------------------------------------------------- | ----------- | -------- |
| provider   | k8s.Provider                                         |             | yes      |
| namespace  | pulumi.Input<string>                                 |             | yes      |
| grafana    | Partial<grafana.GrafanaInputs> & ServiceInputs       |             | yes      |
| prometheus | Partial<prometheus.PrometheusInputs> & ServiceInputs |             | yes      |
| loki       | Partial<loki.LokiInputs> & ServiceInputs             |             | yes      |

## Outputs

| name       | type                         | description | required |
| ---------- | ---------------------------- | ----------- | -------- |
| grafana    | grafana.GrafanaOutputs       |             | yes      |
| prometheus | prometheus.PrometheusOutputs |             | yes      |
| loki       | loki.LokiOutputs             |             | yes      |