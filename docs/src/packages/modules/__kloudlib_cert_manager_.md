
# Module: "@kloudlib/cert-manager"

CertManager is based on [jetstack's cert-manager](https://github.com/jetstack/cert-manager) helm chart.

**`example`** 
```typescript
import { CertManager } from '@kloudlib/cert-manager';

new CertManger('cert-manager', {
  useStagingACME: true,
  acme: {
    email: 'admin@example.com',
  },
});
```

## Index

### Classes

* [CertManager](../classes/__kloudlib_cert_manager_.certmanager.md)

### Interfaces

* [CertManagerInputs](../interfaces/__kloudlib_cert_manager_.certmanagerinputs.md)
* [CertManagerOutputs](../interfaces/__kloudlib_cert_manager_.certmanageroutputs.md)
