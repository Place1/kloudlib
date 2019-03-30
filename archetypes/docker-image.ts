import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import Dockerode from 'dockerode';
import tar from 'tar-fs';
import { URL } from 'url';
import path from 'path';
import fs from 'fs';

export interface DockerImageResourceArgs extends docker.ImageArgs {
  push?: boolean;
  dockerEnv?: pulumi.Input<DockerEnv>;
}

export interface DockerEnv {
  host: string;
  port: number;
  ca: string;
  cert: string;
  key: string;
}

class DockerImageResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(inputs: pulumi.Unwrap<DockerImageResourceArgs>): Promise<pulumi.dynamic.CreateResult> {
    const imageName = inputs.imageName!;

    let build: pulumi.Unwrap<docker.DockerBuild>;

    if (typeof(inputs.build) === 'string') {
      build = { context: inputs.build };
    } else {
      build = inputs.build;
    }

    const imageId = await buildImage(this.getDockerClient(inputs), imageName, build);

    return {
      id: imageId,
      outs: {
        sha: imageId,
      }
    }
  }

  async update(id: pulumi.ID, olds: any, news: any): Promise<pulumi.dynamic.UpdateResult> {
    return this.create(news);
  }

  async delete(id: pulumi.ID, inputs: pulumi.Unwrap<DockerImageResourceArgs>) {
    try {
      await this.getDockerClient(inputs).getImage(id).remove();
    } catch {}
  }

  private getDockerClient(inputs: pulumi.Unwrap<DockerImageResourceArgs>) {
    return new Dockerode(inputs.dockerEnv);
  }
}

export class DockerImageResource extends pulumi.dynamic.Resource {

  public readonly imageName!: pulumi.Output<string>;

  private static provider = new DockerImageResourceProvider();

  constructor(name: string, props: DockerImageResourceArgs, opts?: pulumi.CustomResourceOptions) {
    super(DockerImageResource.provider, name, props, opts);
  }
}

export async function buildImage(client: Dockerode, imageName: string, build: pulumi.Unwrap<docker.DockerBuild>): Promise<string> {
  const tarStream = tar.pack(build.context || process.cwd());

  const options = {
    t: imageName,
    // args: build.args,
    dockerfile: build.dockerfile || 'Dockerfile',
  };

  const stream = await client.buildImage(tarStream, options);

  // wait for the build to finish.
  await new Promise((resolve, reject) => {
    client.modem.followProgress(
      stream,
      (err: any, res: any) => err ? reject(err) : resolve(res),
      (progress: any) => progress.stream && process.stdout.write(progress.stream),
    );
  });

  // return the image id
  const dockerImage = await client.getImage(imageName).inspect();
  return dockerImage.Id;
}

