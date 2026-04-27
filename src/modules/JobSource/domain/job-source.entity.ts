export interface JobSourceProps {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  enabled: boolean;
  lastRun: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class JobSource {
  private constructor(private readonly props: JobSourceProps) {}

  static create(props: {
    id: string;
    name: string;
    slug: string;
    baseUrl: string;
    enabled?: boolean;
    lastRun?: Date | null;
  }): JobSource {
    const now = new Date();

    return new JobSource({
      id: props.id,
      name: props.name,
      slug: props.slug,
      baseUrl: props.baseUrl,
      enabled: props.enabled ?? true,
      lastRun: props.lastRun ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: JobSourceProps): JobSource {
    return new JobSource(props);
  }

  get id() {
    return this.props.id;
  }
  get name() {
    return this.props.name;
  }
  get slug() {
    return this.props.slug;
  }
  get baseUrl() {
    return this.props.baseUrl;
  }
  get enabled() {
    return this.props.enabled;
  }
  get lastRun() {
    return this.props.lastRun;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
}
