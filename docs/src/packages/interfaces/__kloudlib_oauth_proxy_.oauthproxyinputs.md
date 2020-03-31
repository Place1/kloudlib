
# Interface: OAuthProxyInputs

## Properties

### `Optional` banner

• **banner**? : *undefined | string*

banner configures the login page banner text
defaults to undefined (no banner text)

*Defined in [oauth-proxy/index.ts:52](https://github.com/Place1/kloudlib/blob/27a9d16/packages/oauth-proxy/index.ts#L52)*

___

###  domain

• **domain**: *string*

domain configures the domain that the proxy and downstream
services are under
i.e. ".example.com" for all subdomains under example.com

*Defined in [oauth-proxy/index.ts:33](https://github.com/Place1/kloudlib/blob/27a9d16/packages/oauth-proxy/index.ts#L33)*

___

### `Optional` emailDomain

• **emailDomain**? : *undefined | string*

emailDomain limits which emails are
allowed to authenticate with the proxy.
globs are supported.
defaults to '*' (allow all emails)

*Defined in [oauth-proxy/index.ts:47](https://github.com/Place1/kloudlib/blob/27a9d16/packages/oauth-proxy/index.ts#L47)*

___

### `Optional` footer

• **footer**? : *undefined | string*

footer configures the login page footer text
defaults to undefined (no footer text)

*Defined in [oauth-proxy/index.ts:57](https://github.com/Place1/kloudlib/blob/27a9d16/packages/oauth-proxy/index.ts#L57)*

___

###  ingress

• **ingress**: *[Ingress](_abstractions_index_.ingress.md)*

ingress configures the kubernetes ingress resouce
for the proxy
the proxy bust be externally available for users to
access it

*Defined in [oauth-proxy/index.ts:27](https://github.com/Place1/kloudlib/blob/27a9d16/packages/oauth-proxy/index.ts#L27)*

___

### `Optional` mode

• **mode**? : *Google | Azure | GitHub | GitLab*

mode configures the backend service
that the proxy will redirect users to login with
mode can be excluded if you only want to allow
static credentials

*Defined in [oauth-proxy/index.ts:40](https://github.com/Place1/kloudlib/blob/27a9d16/packages/oauth-proxy/index.ts#L40)*

___

### `Optional` namespace

• **namespace**? : *pulumi.Input‹string›*

*Defined in [oauth-proxy/index.ts:16](https://github.com/Place1/kloudlib/blob/27a9d16/packages/oauth-proxy/index.ts#L16)*

___

### `Optional` provider

• **provider**? : *k8s.Provider*

*Defined in [oauth-proxy/index.ts:15](https://github.com/Place1/kloudlib/blob/27a9d16/packages/oauth-proxy/index.ts#L15)*

___

### `Optional` skipProviderButton

• **skipProviderButton**? : *undefined | false | true*

skipLoginPage configures the proxy to go
skip the login (provider button) page
and go directly to the provider's login page.
defaults to false

*Defined in [oauth-proxy/index.ts:64](https://github.com/Place1/kloudlib/blob/27a9d16/packages/oauth-proxy/index.ts#L64)*

___

### `Optional` staticCredentials

• **staticCredentials**? : *StaticCredentials[]*

additional credentials configures the proxy
to allow users to login directly using a set
of static credentials.

*Defined in [oauth-proxy/index.ts:70](https://github.com/Place1/kloudlib/blob/27a9d16/packages/oauth-proxy/index.ts#L70)*

___

### `Optional` version

• **version**? : *undefined | string*

the helm chart version

*Defined in [oauth-proxy/index.ts:20](https://github.com/Place1/kloudlib/blob/27a9d16/packages/oauth-proxy/index.ts#L20)*
