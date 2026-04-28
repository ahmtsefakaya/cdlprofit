/**
 * firestoreService.js
 * Centralized Firestore CRUD helper.
 * All entity modules use this — it ensures auth.currentUser is always resolved.
 */
import { db, auth } from './firebase';
import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    writeBatch,
    orderBy,
    limit,
    startAfter,
    getDoc,
} from 'firebase/firestore';

function getUID() {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated — please log in again.');
    return uid;
}

function colRef(subcollection) {
    return collection(db, 'users', getUID(), subcollection);
}

function docRef(subcollection, id) {
    return doc(db, 'users', getUID(), subcollection, id);
}

const firestoreService = {
    /** List all documents in a subcollection */
    list: async (sub) => {
        const snap = await getDocs(colRef(sub));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    /** Get single document */
    get: async (sub, id) => {
        const snap = await getDoc(docRef(sub, id));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    },

    /** Create a document, returns it with generated id */
    create: async (sub, data) => {
        const payload = { ...data, createdAt: new Date().toISOString() };
        const ref = await addDoc(colRef(sub), payload);
        return { id: ref.id, ...payload };
    },

    /** Update an existing document */
    update: async (sub, id, data) => {
        const payload = { ...data, updatedAt: new Date().toISOString() };
        await updateDoc(docRef(sub, id), payload);
        return { id, ...payload };
    },

    /** Delete a document by id */
    delete: async (sub, id) => {
        await deleteDoc(docRef(sub, id));
    },

    /** Batch create multiple documents */
    bulkCreate: async (sub, arr) => {
        const batch = writeBatch(db);
        const ref = colRef(sub);
        arr.forEach((data) => {
            const d = doc(ref);
            batch.set(d, { ...data, createdAt: new Date().toISOString() });
        });
        await batch.commit();
    },

    /**
     * Filter documents.
     * filters: array of { field, operator, value }
     *          OR legacy plain object { field: value } with implicit '==' operator
     */
    filter: async (sub, filters) => {
        const constraints = Array.isArray(filters)
            ? filters.map(({ field, operator = '==', value }) => where(field, operator, value))
            : Object.entries(filters).map(([k, v]) => where(k, '==', v));
        const q = query(colRef(sub), ...constraints);
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    /**
     * Paginated list with cursor-based navigation.
     */
    listPaginated: async (sub, { pageSize = 25, lastDocId = null, sortField = 'createdAt', sortDir = 'desc' } = {}) => {
        let q = query(colRef(sub), orderBy(sortField, sortDir), limit(pageSize));
        if (lastDocId) {
            const lastSnap = await getDoc(docRef(sub, lastDocId));
            if (lastSnap.exists()) {
                q = query(colRef(sub), orderBy(sortField, sortDir), startAfter(lastSnap), limit(pageSize));
            }
        }
        const snap = await getDocs(q);
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return { docs, hasMore: docs.length === pageSize, lastDocId: docs.at(-1)?.id ?? null };
    },
};

export default firestoreService;
