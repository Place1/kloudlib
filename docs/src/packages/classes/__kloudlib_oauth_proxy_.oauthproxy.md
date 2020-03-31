
# Class: OAuthProxy <**TData**>

## Constructors

###  constructor

\+ **new OAuthProxy**(`name`: string, `props`: [OAuthProxyInputs](../interfaces/__kloudlib_oauth_proxy_.oauthproxyinputs.md), `opts?`: pulumi.CustomResourceOptions): *[OAuthProxy](__kloudlib_oauth_proxy_.oauthproxy.md)*

*Defined in [oauth-proxy/index.ts:120](https://github.com/Place1/kloudlib/blob/27a9d16/packages/oauth-proxy/index.ts#L120)*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |
`props` | [OAuthProxyInputs](../interfaces/__kloudlib_oauth_proxy_.oauthproxyinputs.md) |
`opts?` | pulumi.CustomResourceOptions |

**Returns:** *[OAuthProxy](__kloudlib_oauth_proxy_.oauthproxy.md)*

## Properties

###  ingress

• **ingress**: *pulumi.Output‹[Ingress](../interfaces/_abstractions_index_.ingress.md)›*

*Defined in [oauth-proxy/index.ts:120](https://github.com/Place1/kloudlib/blob/27a9d16/packages/oauth-proxy/index.ts#L120)*

___

###  meta

• **meta**: *pulumi.Output‹[HelmMeta](../interfaces/_abstractions_index_.helmmeta.md)›*

*Defined in [oauth-proxy/index.ts:119](https://github.com/Place1/kloudlib/blob/27a9d16/packages/oauth-proxy/index.ts#L119)*

## Methods

###  nginxAnnotations

▸ **nginxAnnotations**(): *object*

*Defined in [oauth-proxy/index.ts:209](https://github.com/Place1/kloudlib/blob/27a9d16/packages/oauth-proxy/index.ts#L209)*

nginxAnnotations returns an object including the required
ingress annotations to use this OAuthProxy with an nginx-ingress
backed ingress resource

**Returns:** *object*

* **nginx.ingress.kubernetes.io/auth-signin**: *OutputInstance‹string› & object* = this.ingress.hosts!.apply(
        (hosts: any) => `https://${hosts[0]}/oauth2/start?rd=https://$host$request_uri`
      )

* **nginx.ingress.kubernetes.io/auth-url**: *OutputInstance‹string› & object* = this.ingress.hosts!.apply(
        (hosts: any) => `https://${hosts[0]}/oauth2/auth`
      )
