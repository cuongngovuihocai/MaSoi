import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  getDocFromServer,
  onSnapshot,
  collection,
  query,
  orderBy,
  updateDoc,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ChatMessage, NightActionRecord, Player, Room, VoteRecord } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId if configured
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

let currentUser: User | { uid: string; isAnonymous: boolean } | null = null;

// Authenticate anonymously or fallback to session ID if restricted by config
export async function ensureAuth(): Promise<User | { uid: string; isAnonymous: boolean }> {
  if (currentUser) return currentUser;

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        unsubscribe();
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          currentUser = cred.user;
          unsubscribe();
          resolve(cred.user);
        } catch (err) {
          console.warn('Firebase anonymous auth restricted, continuing with guest session:', err);
          const fallbackUser = {
            uid: `guest_${Math.random().toString(36).substring(2, 9)}`,
            isAnonymous: true,
          };
          currentUser = fallbackUser;
          unsubscribe();
          resolve(fallbackUser);
        }
      }
    });
  });
}

// Connection test as required by firebase-skill
export async function testConnection() {
  try {
    await getDoc(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && (error.message.includes('offline') || error.message.includes('unavailable') || error.message.includes('Could not reach Cloud Firestore'))) {
      console.warn('Firestore operating in offline / fallback mode:', error.message);
    } else {
      console.warn('Firestore connection test notice:', error);
    }
  }
}

// Realtime listeners
export function subscribeToRoom(roomId: string, callback: (room: Room | null) => void) {
  const roomRef = doc(db, 'rooms', roomId);
  return onSnapshot(
    roomRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as Room);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Room subscription notice:', err);
    }
  );
}

export function subscribeToPlayers(roomId: string, callback: (players: Player[]) => void) {
  const playersCol = collection(db, 'rooms', roomId, 'players');
  return onSnapshot(
    playersCol,
    (snapshot) => {
      const players: Player[] = [];
      snapshot.forEach((doc) => {
        players.push(doc.data() as Player);
      });

      // Automatic garbage collection: If room has players but 0 human players left, clean up room
      if (players.length > 0) {
        const humanCount = players.filter((p) => !p.isBot).length;
        if (humanCount === 0) {
          deleteRoomCompletely(roomId);
        }
      }

      callback(players);
    },
    (err) => {
      console.warn('Players subscription notice:', err);
    }
  );
}

export function subscribeToMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void
) {
  const messagesCol = collection(db, 'rooms', roomId, 'messages');
  const q = query(messagesCol, orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push(doc.data() as ChatMessage);
      });
      callback(msgs);
    },
    (err) => {
      console.warn('Messages subscription notice:', err);
    }
  );
}

export function subscribeToVotes(
  roomId: string,
  callback: (votes: VoteRecord[]) => void
) {
  const votesCol = collection(db, 'rooms', roomId, 'votes');
  return onSnapshot(
    votesCol,
    (snapshot) => {
      const votes: VoteRecord[] = [];
      snapshot.forEach((doc) => {
        votes.push(doc.data() as VoteRecord);
      });
      callback(votes);
    },
    (err) => {
      console.warn('Votes subscription notice:', err);
    }
  );
}

export function subscribeToActions(
  roomId: string,
  callback: (actions: NightActionRecord[]) => void
) {
  const actionsCol = collection(db, 'rooms', roomId, 'actions');
  return onSnapshot(
    actionsCol,
    (snapshot) => {
      const actions: NightActionRecord[] = [];
      snapshot.forEach((doc) => {
        actions.push(doc.data() as NightActionRecord);
      });
      callback(actions);
    },
    (err) => {
      console.warn('Actions subscription notice:', err);
    }
  );
}

// Helper to strip undefined values which cause Firestore setDoc/updateDoc errors
function sanitizeData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeData(item)) as unknown as T;
  }
  const result: any = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      result[key] = sanitizeData(value);
    }
  }
  return result;
}

// Room operations
export async function createRoom(roomData: Room, hostPlayer: Player): Promise<string> {
  const roomRef = doc(db, 'rooms', roomData.id);
  await setDoc(roomRef, sanitizeData(roomData));

  const playerRef = doc(db, 'rooms', roomData.id, 'players', hostPlayer.id);
  await setDoc(playerRef, sanitizeData(hostPlayer));

  return roomData.id;
}

export async function joinRoom(roomId: string, player: Player): Promise<boolean> {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error('Mã phòng không tồn tại!');
  }

  const room = roomSnap.data() as Room;
  if (room.status !== 'lobby') {
    throw new Error('Trận đấu đã bắt đầu!');
  }

  const playerRef = doc(db, 'rooms', roomId, 'players', player.id);
  await setDoc(playerRef, sanitizeData(player));
  return true;
}

export async function batchJoinPlayers(roomId: string, players: Player[]): Promise<boolean> {
  const batch = writeBatch(db);
  players.forEach((p) => {
    const playerRef = doc(db, 'rooms', roomId, 'players', p.id);
    batch.set(playerRef, sanitizeData(p));
  });
  await batch.commit();
  return true;
}

export async function batchUpdatePlayers(
  roomId: string,
  updatesList: { id: string; updates: Partial<Player> }[]
) {
  const batch = writeBatch(db);
  updatesList.forEach(({ id, updates }) => {
    const playerRef = doc(db, 'rooms', roomId, 'players', id);
    batch.update(playerRef, sanitizeData(updates));
  });
  await batch.commit();
}

export async function updateRoomState(roomId: string, updates: Partial<Room>) {
  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(
    roomRef,
    sanitizeData({
      ...updates,
      updatedAt: Date.now(),
    })
  );
}

export async function updatePlayerState(
  roomId: string,
  playerId: string,
  updates: Partial<Player>
) {
  const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
  await updateDoc(playerRef, sanitizeData(updates));
}

export async function sendChatMessage(roomId: string, message: Omit<ChatMessage, 'id'>) {
  const messagesCol = collection(db, 'rooms', roomId, 'messages');
  const newRef = doc(messagesCol);
  const fullMsg: ChatMessage = {
    ...message,
    id: newRef.id,
  };
  await setDoc(newRef, sanitizeData(fullMsg));
}

export async function submitVote(roomId: string, vote: VoteRecord) {
  const voteRef = doc(db, 'rooms', roomId, 'votes', vote.voterId);
  await setDoc(voteRef, sanitizeData(vote));
}

export async function submitNightAction(roomId: string, action: NightActionRecord) {
  const isMultiTarget = action.actionType === 'cupid_link' || action.actionType === 'piper_enchant' || action.actionType === 'fox_sniff';
  const targetSuffix = isMultiTarget && action.targetId ? `_${action.targetId}` : '';
  const docId = `${action.actorId}_${action.actionType}${targetSuffix}_${action.dayNumber}`;
  const actionRef = doc(db, 'rooms', roomId, 'actions', docId);
  await setDoc(actionRef, sanitizeData(action));
}

export async function deleteNightAction(roomId: string, action: NightActionRecord) {
  const isMultiTarget = action.actionType === 'cupid_link' || action.actionType === 'piper_enchant' || action.actionType === 'fox_sniff';
  const targetSuffix = isMultiTarget && action.targetId ? `_${action.targetId}` : '';
  const docId = `${action.actorId}_${action.actionType}${targetSuffix}_${action.dayNumber}`;
  const actionRef = doc(db, 'rooms', roomId, 'actions', docId);
  await deleteDoc(actionRef);
}

export async function clearNightActionsAndVotes(roomId: string) {
  const batch = writeBatch(db);

  // Clear votes from previous discussion/voting rounds
  const votesCol = collection(db, 'rooms', roomId, 'votes');
  const votesSnap = await getDocs(votesCol);
  votesSnap.forEach((d) => batch.delete(d.ref));

  await batch.commit();
}

export async function deleteRoomCompletely(roomId: string) {
  try {
    const roomRef = doc(db, 'rooms', roomId);

    // Delete all docs in subcollections
    const subcols = ['players', 'messages', 'votes', 'actions'];
    for (const sub of subcols) {
      const snap = await getDocs(collection(db, 'rooms', roomId, sub));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }

    // Delete main room doc
    await deleteDoc(roomRef);
  } catch (err) {
    console.warn(`Error completely deleting room ${roomId}:`, err);
  }
}

export async function leaveRoom(roomId: string, playerId: string) {
  try {
    const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
    await deleteDoc(playerRef);

    // Check remaining players
    const playersSnap = await getDocs(collection(db, 'rooms', roomId, 'players'));
    const remainingPlayers: Player[] = [];
    playersSnap.forEach((d) => remainingPlayers.push(d.data() as Player));

    // If no human players left, clean up the entire room and subcollections
    const humanCount = remainingPlayers.filter((p) => !p.isBot).length;
    if (humanCount === 0) {
      await deleteRoomCompletely(roomId);
    }
  } catch (err) {
    console.warn(`Error leaving room ${roomId}:`, err);
  }
}

