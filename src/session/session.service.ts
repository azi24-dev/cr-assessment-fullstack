import { Injectable } from '@angular/core';
import { ReqUser } from '../backend/cr.types';
import { users } from '../backend/seed';

/** Holds the current signed-in user. Components read `user` to decide which actions to offer. */
@Injectable({ providedIn: 'root' })
export class SessionService {
	user: ReqUser = users.mona;
}
