import { logger } from '../utils';
import { SparkJob, SparkServer, LogEvent } from '../models';
import spark from "../spark";
import * as _ from 'lodash';
import getPort from 'get-port';
import Docker from 'dockerode';
import got from 'got';

class JobRunner {
    job: SparkJob;
    availableHosts: SparkServer[];

    constructor(job: SparkJob) {
        this.job = job;
    }

    kickOff = async () => {
        logger.info('Initializing job')
        this.init();
        logger.info(`Deploying ${this.job.name} to servers tagged with ${this.job.tags.join(', ')}`);
        await this.pushToHosts();
    }

    init = () => {
        const hosts = [{
            hostName: `htpp://${spark.sparkServer.hostName}:${spark.sparkServer.port}`,
            tags: spark.sparkServer.tags,
            state: spark.sparkServer.state,
            siblings: spark.sparkServer.siblings
        }, ...spark.sparkServer.siblings];
        this.availableHosts = hosts.filter(host => {
            let match = true;
            for ( let i = 0; i < this.job.tags.length; i++) {
                const tag = this.job.tags[i];
                if (host.tags.indexOf(tag) === -1) {
                    match = false;
                    break;
                }
            }
            return match;
        });
        spark.logMaster.addLog(LogEvent.RunJob, `${this.job.name} kick off`);
        logger.info(`${this.availableHosts.length} host found with tag(s) ${this.job.tags.join(', ')}`);
    }

    pushToHosts = async () => {
        const { id } = await spark.jobLedger.createJob(this.job.name, this.availableHosts.map(host => host.hostName));

        await Promise.all(this.availableHosts.map(async host => {
            try {

                const { name, image, tags, desiredHosts, port, exposedPort, env} = this.job;


                const res = await got.post(`${host.hostName}/runJob`, {
                    json: true,
                    body: {
                        job: {
                            id,
                            name,
                            image,
                            tags,
                            desiredHosts,
                            port,
                            exposedPort,
                            env
                        }
                    },
                    timeout: spark.sparkServer.health.max
                });

                logger.info(`Job ${name} was successful to host ${host.hostName}`);

                spark.logMaster.addLog(LogEvent.RunJob, `${name}-${id} deployed to host ${host.hostName}`);

            } catch (e) {
                logger.error('An error occured while deploying the job ', e);
            }
        }));

        logger.info(`${this.job.name} deployed to all hosts`);
    }

    buildJob = async () => {
        const exposedPort = (this.job.exposedPort === 'auto') ? await getPort() : this.job.exposedPort;

        logger.info(`Exposing port ${exposedPort}`);

        const { image, name, port, env, id } = this.job;

        const envConverted = Object.keys(env).map(envKey =>
            `${envKey}=${env[envKey]}`
        );

        const portMap = `${port}/tcp`;

        const exposed: any = {};
        exposed[portMap] = {};

        const bindings: any = {}
        bindings[portMap] = [{
            HostPort: exposedPort.toString()
        }];

        const options = {
            Image: image,
            ExposedPorts: exposed,
            Env: envConverted,
            name: `${name}-${id}`,
            HostConfig: {
                PortBindings: bindings
            }
        }

        return options;
    }

    runJob = async () => {
        
        const options = await this.buildJob();
        
        const docker = new Docker({
            host: '127.0.0.1',
            port: 2375,
        });

        logger.info(`Pulling ${this.job.image} from dockerhub`);

        try {
            await docker.pull(this.job.image, (err: Error, stream: NodeJS.ReadableStream) => {
                if (err) {
                    throw err
                }
                stream.pipe(process.stdout)
            });

            logger.info(`Download successful`);

            spark.logMaster.addLog(LogEvent.ImagePulled, `${this.job.image} downloaded for job ${this.job.name}`);

            await docker.createContainer(options, (err: Error, result) => {
                if (err) throw err;
                result!.start((startErr: Error, startRes: any) => {
                    if (startErr) logger.error('An error occured while deploying the job', startErr);
                })
            });
            const completing = await spark.jobLedger.getCompleting(this.job.name);

            logger.info(`${this.job.name} successfully started on ${spark.sparkServer.hostName}`)



            spark.logMaster.addLog(LogEvent.JobStarted, `${this.job.image} started for job ${this.job.name}`);
        } catch (e) {
            logger.error('An error occured while running the job', e);
        }
        

        
    }

}

export default JobRunner;
