# OAuthProxy

## Inputs

| name               | type                             | description                                                                                                                                            | required |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| provider           | k8s.Provider                     |                                                                                                                                                        | yes      |
| namespace          | pulumi.Input<string>             |                                                                                                                                                        | yes      |
| version            | string                           | the helm chart version                                                                                                                                 | yes      |
| ingress            | abstractions.Ingress             | ingress configures the kubernetes ingress resouce for the proxy the proxy bust be externally available for users to access it                          | no       |
| domain             | string                           | domain configures the domain that the proxy and downstream services are under i.e. ".example.com" for all subdomains under example.com                 | no       |
| mode               | Google | Azure | GitHub | GitLab | mode configures the backend service that the proxy will redirect users to login with mode can be excluded if you only want to allow static credentials | yes      |
| emailDomain        | string                           | emailDomain limits which emails are allowed to authenticate with the proxy. globs are supported. defaults to '*' (allow all emails)                    | yes      |
| banner             | string                           | banner configures the login page banner text defaults to undefined (no banner text)                                                                    | yes      |
| footer             | string                           | footer configures the login page footer text defaults to undefined (no footer text)                                                                    | yes      |
| skipProviderButton | boolean                          | skipLoginPage configures the proxy to go skip the login (provider button) page and go directly to the provider's login page. defaults to false         | yes      |
| staticCredentials  | StaticCredentials[]              | additional credentials configures the proxy to allow users to login directly using a set of static credentials.                                        | yes      |

## Outputs

| name    | type                                 | description | required |
| ------- | ------------------------------------ | ----------- | -------- |
| meta    | pulumi.Output<abstractions.HelmMeta> |             | no       |
| ingress | pulumi.Output<abstractions.Ingress>  |             | no       |