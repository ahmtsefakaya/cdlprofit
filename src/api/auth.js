import { auth } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';

export const authService = {
  login: (email, password) => signInWithEmailAndPassword(auth, email, password),
  register: ({ email, password }) => createUserWithEmailAndPassword(auth, email, password),
  logout: () => signOut(auth),
  me: () => auth.currentUser,
  resetPassword: (email) => sendPasswordResetEmail(auth, email),
};

export { auth as firebaseAuth };
export default authService;

