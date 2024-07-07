import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, getDoc, onSnapshot, updateDoc, arrayUnion, Timestamp, setDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import BottomBar from '../BottomBar';
import './agent-client-chat.css';
import BackButton from '../BackButton/back-button.js';

const AgentClientChat = ({ setDirection }) => {
  const { clientId } = useParams();
  const [agentData, setAgentData] = useState({});
  const [clientName, setClientName] = useState('');
  const [chatData, setChatData] = useState([]);
  const [message, setMessage] = useState('');
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const agentQuery = doc(collection(db, 'Agents'), user.uid);
          const agentSnapshot = await getDoc(agentQuery);
          if (agentSnapshot.exists()) {
            setAgentData(agentSnapshot.data());
          } else {
            console.error('Agent document does not exist');
          }
          await fetchClientName();
          subscribeToChat();
          markMessagesAsRead();
        } catch (error) {
          console.error('Error fetching agent document:', error);
        }
      }
    });

    window.addEventListener('resize', handleResize);

    return () => {
      unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatData]);

  const fetchClientName = async () => {
    try {
      const clientQuery = query(collection(db, 'Clients'), where('client_id', '==', clientId));
      const clientSnapshot = await getDocs(clientQuery);
      if (!clientSnapshot.empty) {
        const clientData = clientSnapshot.docs[0].data();
        setClientName(clientData.full_name);
      } else {
        console.error('Client document does not exist');
      }
    } catch (error) {
      console.error('Error fetching client document:', error);
    }
  };

  const subscribeToChat = () => {
    const chatRef = doc(db, 'AgentChat', clientId);
    const unsubscribe = onSnapshot(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const agentChat = snapshot.data().Agent_chat || [];
        const clientChat = snapshot.data().Client_chat || [];
        setChatData([...agentChat, ...clientChat].sort((a, b) => a.timestamp.seconds - b.timestamp.seconds));
      } else {
        console.error('Chat document does not exist');
      }
    });
    return unsubscribe;
  };

  const markMessagesAsRead = async () => {
    const chatRef = doc(db, 'AgentChat', clientId);
    try {
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const clientChat = chatSnap.data().Client_chat || [];
        const unreadMessages = clientChat.filter(chat => !chat.read).map(chat => ({ ...chat, read: true }));
        if (unreadMessages.length > 0) {
          const updatedClientChat = clientChat.map(chat => {
            if (unreadMessages.some(unread => unread.timestamp.seconds === chat.timestamp.seconds)) {
              return { ...chat, read: true };
            }
            return chat;
          });
          await updateDoc(chatRef, {
            Client_chat: updatedClientChat
          });
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (message.trim() === '') return;
    const chatRef = doc(db, 'AgentChat', clientId);

    const chatData = {
      message: message,
      timestamp: Timestamp.now(),
      sender: agentData.displayName,
      read: false // Agent's message should be unread for the client
    };

    try {
      const docSnap = await getDoc(chatRef);
      if (docSnap.exists()) {
        await updateDoc(chatRef, {
          Agent_chat: arrayUnion(chatData)
        });
      } else {
        await setDoc(chatRef, {
          Agent_chat: [chatData],
          Client_chat: []
        });
      }
      setMessage('');
      scrollToBottom(); // Scroll to bottom after sending a message
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleResize = () => {
    if (inputRef.current) {
      inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  return (
    <div className="agent-client-chat">
      <div className="top-bar-fixed">
        <BackButton />
        <div className="client-name-fixed">{clientName}</div>
      </div>
      <div className="chat-container" ref={chatContainerRef}>
        <div className="chat-messages">
          {chatData.map((chat, index) => (
            <div key={index} className={`chat-message ${chat.sender === agentData.displayName ? 'sent' : 'received'}`}>
              <span>{chat.message}</span>
              <span className="chat-timestamp">{chat.timestamp.toDate().toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="chat-input" ref={inputRef}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          onFocus={handleResize}
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
      <BottomBar />
    </div>
  );
};

export default AgentClientChat;
