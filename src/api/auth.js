import { auth } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

export const authService = {
  login: (email, password) => signInWithEmailAndPassword(auth, email, password),
  register: ({ email, password }) => createUserWithEmailAndPassword(auth, email, password),
  logout: () => signOut(auth),
  me: () => auth.currentUser,
};

export { auth as firebaseAuth };
export default authService;
