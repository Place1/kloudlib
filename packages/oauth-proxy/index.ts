/**
 * @module "@kloudlib/oauth-proxy"
 * @packageDocumentation
 */

import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as random from '@pulumi/random';
import * as abstractions from '@kloudlib/abstractions';
import { pickBy } from 'lodash';
import { createHash } from 'crypto';
import { replaceApiVersion } from '@kloudlib/utils';

export interface OAuthProxyInputs {
  provider?: k8s.Provider;
  namespace?: pulumi.Input<string>;
  /**
   * the helm chart version
   */
  version?: string;
  /**
   * ingress configures the kubernetes ingress resouce
   * for the proxy
   * the proxy bust be externally available for users to
   * access it
   */
  ingress: abstractions.Ingress;
  /**
   * domain configures the domain that the proxy and downstream
   * services are under
   * i.e. ".example.com" for all subdomains under example.com
   */
  domain: string;
  /**
   * mode configures the backend service
   * that the proxy will redirect users to login with
   * mode can be excluded if you only want to allow
   * static credentials
   */
  mode?: Google | Azure | GitHub | GitLab;
  /**
   * emailDomain limits which emails are
   * allowed to authenticate with the proxy.
   * globs are supported.
   * defaults to '*' (allow all emails)
   */
  emailDomain?: string;
  /**
   * banner configures the login page banner text
   * defaults to undefined (no banner text)
   */
  banner?: string;
  /**
   * footer configures the login page footer text
   * defaults to undefined (no footer text)
   */
  footer?: string;
  /**
   * skipLoginPage configures the proxy to go
   * skip the login (provider button) page
   * and go directly to the provider's login page.
   * defaults to false
   */
  skipProviderButton?: boolean;
  /**
   * additional credentials configures the proxy
   * to allow users to login directly using a set
   * of static credentials.
   */
  staticCredentials?: StaticCredentials[];
}

interface StaticCredentials {
  username: pulumi.Input<string>;
  password: pulumi.Input<string>;
}

interface OAuthBackend {
  clientId: pulumi.Input<string>;
  clientSecret: pulumi.Input<string>;
}

/**
 * see: https://pusher.github.io/oauth2_proxy/auth-configuration#google-auth-provider
 */
interface Google extends OAuthBackend {
  kind: 'Google';
  googleAdminEmail: string;
  googleGroup: string;
  googleServiceAccountJson: string;
}

interface Azure extends OAuthBackend {
  kind: 'Azure';
}

interface GitHub extends OAuthBackend {
  kind: 'GitHub';
  githubOrg?: string;
  githubTeam?: string;
  githubEnterpriseHost?: string;
}

interface GitLab extends OAuthBackend {
  kind: 'GitLab';
  gitlabGroup?: string;
  gitlabHost?: string;
}

export interface OAuthProxyOutputs {
  meta: pulumi.Output<abstractions.HelmMeta>;
  ingress: pulumi.Output<abstractions.Ingress>;
}

/**
 * @noInheritDoc
 */
export class OAuthProxy extends pulumi.ComponentResource implements OAuthProxyOutputs {
  readonly meta: pulumi.Output<abstractions.HelmMeta>;
  readonly ingress: pulumi.Output<abstractions.Ingress>;

  constructor(name: string, props: OAuthProxyInputs, opts?: pulumi.CustomResourceOptions) {
    super('kloudlib:OAuthProxy', name, props, opts);

    const cookieSecret = new random.RandomString(
      'cookie-secret',
      {
        length: 32,
      },
      {
        parent: this,
      }
    );

    this.ingress = pulumi.output(props.ingress);

    this.meta = pulumi.output<abstractions.HelmMeta>({
      chart: 'oauth2-proxy',
      version: props.version ?? '2.1.1',
      repo: 'https://kubernetes-charts.storage.googleapis.com',
    });

    new k8s.helm.v2.Chart(
      `${name}-oauthproxy`,
      {
        namespace: props.namespace,
        chart: this.meta.chart,
        version: this.meta.version,
        fetchOpts: {
          repo: this.meta.repo,
        },
        transformations: [replaceApiVersion('Ingress', 'extensions/v1beta1', 'networking.k8s.io/v1beta1')],
        values: {
          config: {
            clientID: props.mode?.clientId,
            clientSecret: props.mode?.clientSecret,
            cookieSecret: cookieSecret.result,
          },
          extraArgs: pickBy({
            'whitelist-domain': props.domain,
            'cookie-domain': props.domain,
            'email-domain': props.emailDomain ?? '*',
            banner: props.banner,
            footer: props.footer,
            'skip-provider-button': props.skipProviderButton,
            ...this.providerArgs(props),
          }),
          htpasswdFile: !props.staticCredentials
            ? { enabled: false }
            : {
                enabled: true,
                entries: props.staticCredentials.map((credential) => {
                  return this.passwd(credential.username, credential.password);
                }),
              },
          ingress: {
            enabled: true,
            annotations: {
              'kubernetes.io/ingress.class': props.ingress.class ?? 'nginx',
              'kubernetes.io/tls-acme': props.ingress.tls === false ? 'false' : 'true', // "tls" defaults to true, so we'll activate tls for undefined or null values
              ...props.ingress.annotations,
            },
            hosts: props.ingress.hosts,
            tls: [
              {
                hosts: props.ingress.hosts,
                secretName: `tls-oauthproxy-${name}`,
              },
            ],
          },
        },
      },
      {
        parent: this,
        providers: props.provider
          ? {
              kubernetes: props.provider,
            }
          : {},
      }
    );
  }

  /**
   * nginxAnnotations returns an object including the required
   * ingress annotations to use this OAuthProxy with an nginx-ingress
   * backed ingress resource
   */
  nginxAnnotations() {
    return {
      'nginx.ingress.kubernetes.io/auth-url': this.ingress.hosts!.apply(
        (hosts: any) => `https://${hosts[0]}/oauth2/auth`
      ),
      'nginx.ingress.kubernetes.io/auth-signin': this.ingress.hosts!.apply(
        (hosts: any) => `https://${hosts[0]}/oauth2/start?rd=https://$host$request_uri`
      ),
    };
  }

  private providerArgs(props: OAuthProxyInputs): Record<string, string | undefined> {
    switch (props.mode?.kind) {
      case 'Azure':
        return this.azureExtraArgs(props.mode);
      case 'GitHub':
        return this.gitHubExtraArgs(props.mode);
      case 'GitLab':
        return this.gitLabExtraArgs(props.mode);
      case 'Google':
        return this.googleExtraArgs(props.mode);
      default:
        return {};
    }
  }

  private azureExtraArgs(props: Azure) {
    return {
      provider: 'azure',
    };
  }

  private gitHubExtraArgs(props: GitHub) {
    return {
      provider: 'github',
      'github-org': props.githubOrg,
      'github-team': props.githubTeam,
    };
  }

  private gitLabExtraArgs(props: GitLab) {
    return {
      provider: 'gitlab',
      'gitlab-group': props.gitlabGroup,
      'oidc-issuer-url': props.gitlabHost,
    };
  }

  private googleExtraArgs(props: Google) {
    return {
      provider: 'google',
      'google-admin-email': props.googleAdminEmail,
      'google-group': props.googleGroup,
      'google-service-account-json': props.googleServiceAccountJson,
    };
  }

  private passwd(username: pulumi.Input<string>, password: pulumi.Input<string>): pulumi.Output<string> {
    return pulumi.all([username, password]).apply(([u, p]) => {
      return `${u}:{SHA}${createHash('sha1').update(p).digest('base64')}`;
    });
  }
}
