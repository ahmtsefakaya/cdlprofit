import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../api/firebase';

/**
 * Subscribe to Firestore collection changes and sync with React Query cache.
 * Waits for Firebase auth to resolve before subscribing.
 *
 * @param {string} collectionName - Firestore sub-collection name
 * @param {string|string[]} queryKey - React Query cache key to invalidate
 */
export function useFirestoreSync(collectionName, queryKey) {
    const queryClient = useQueryClient();
    const unsubSnapshotRef = useRef(null);
    const unsubAuthRef = useRef(null);

    useEffect(() => {
        // Wait for auth to resolve, then subscribe
        unsubAuthRef.current = onAuthStateChanged(auth, (user) => {
            // Tear down any existing snapshot listener
            if (unsubSnapshotRef.current) {
                unsubSnapshotRef.current();
                unsubSnapshotRef.current = null;
            }
            if (!user) return;

            const colRef = collection(db, 'users', user.uid, collectionName);
            const key = Array.isArray(queryKey) ? queryKey : [queryKey];

            unsubSnapshotRef.current = onSnapshot(
                colRef,
                () => { queryClient.invalidateQueries({ queryKey: key }); },
                (err) => { console.error(`Firestore sync error [${collectionName}]:`, err); }
            );
        });

        return () => {
            unsubAuthRef.current?.();
            unsubSnapshotRef.current?.();
        };
    }, [collectionName, queryKey, queryClient]);
}

export default useFirestoreSync;
