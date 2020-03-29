# CertManager

## Inputs

| name           | type                 | description                                                                                           | required |
| -------------- | -------------------- | ----------------------------------------------------------------------------------------------------- | -------- |
| provider       | k8s.Provider         |                                                                                                       | yes      |
| namespace      | pulumi.Input<string> |                                                                                                       | yes      |
| version        | string               | the helm chart version                                                                                | yes      |
| useStagingACME | boolean              | if true then the staging ACME api will be used rather than the production ACME api. defaults to false | yes      |
| acme           | object               | configure acme settings                                                                               | yes      |
| acme.email     | string               | the email that letsencrypt reminders will be sent to                                                  | yes      |

## Outputs

| name | type                                 | description | required |
| ---- | ------------------------------------ | ----------- | -------- |
| meta | pulumi.Output<abstractions.HelmMeta> |             | no       |