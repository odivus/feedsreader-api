import { User } from '../models/User';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // Augments the User type passport attaches to `req.user`
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends InstanceType<typeof User> {}
  }
}

export {};
