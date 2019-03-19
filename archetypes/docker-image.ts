import * as pulumi from '@pulumi/pulumi';
import { ImageArgs } from '@pulumi/docker';
import * as cp from 'child_process';

class DockerImageResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(inputs: pulumi.Unwrap<ImageArgs>): Promise<pulumi.dynamic.CreateResult> {
    const imageName = inputs.localImageName;
    const context = inputs.build;
    const { stdout } = await exec(`docker build -q -t ${imageName} ${context}`);
    const imageId = stdout.trim();
    return {
      id: stdout.trim(),
      outs: {
        sha: imageId,
      }
    }
  }

  async delete(id: pulumi.ID, props: any) {
    await exec(`docker rmi ${id}`);
  }
}

export class DockerImageResource extends pulumi.dynamic.Resource {

  public readonly imageName!: pulumi.Output<string>;

  private static provider = new DockerImageResourceProvider();

  constructor(name: string, props: ImageArgs, opts?: pulumi.CustomResourceOptions) {
    super(DockerImageResource.provider, name, props, opts);
  }
}

function exec (command: string, options = { cwd: process.cwd() }) {
  return new Promise<{ stdout: string, stderr: string }>((resolve, reject) => {
    cp.exec(command, { ...options }, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}
