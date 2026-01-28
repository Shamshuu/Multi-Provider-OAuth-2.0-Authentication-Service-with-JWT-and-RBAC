import { User } from '../../services/user.service';

declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}
