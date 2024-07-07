import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import './my-chat.css';
import TopBar from '../TopBar';

const MyChat = () => {
  const [agentData, setAgentData] = useState({});
  const [chats, setChats] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const agentQuery = query(collection(db, 'Agents'), where('email', '==', user.email));
          const agentSnapshot = await getDocs(agentQuery);
          if (!agentSnapshot.empty) {
            const agent = agentSnapshot.docs[0].data();
            setAgentData(agent);
            setupRealtimeListeners(agent.displayName);
          } else {
            console.error('Agent document does not exist');
          }
        } catch (error) {
          console.error('Error fetching agent document:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const setupRealtimeListeners = (agentName) => {
    const clientsQuery = query(collection(db, 'Clients'), where('assigned_agent_id', '==', agentName));
    onSnapshot(clientsQuery, (clientsSnapshot) => {
      const clientsList = clientsSnapshot.docs.map(doc => doc.data());
      const chatsList = [];

      clientsList.forEach(client => {
        try {
          const chatRef = doc(db, 'AgentChat', client.client_id);
          onSnapshot(chatRef, (chatSnapshot) => {
            if (chatSnapshot.exists()) {
              const chatData = chatSnapshot.data();
              const agentChat = chatData.Agent_chat ? Object.values(chatData.Agent_chat) : [];
              const clientChat = chatData.Client_chat ? Object.values(chatData.Client_chat) : [];

              const allMessages = [...agentChat, ...clientChat].filter(msg => msg.timestamp && msg.timestamp.seconds)
                .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

              const lastMessage = allMessages.length > 0 ? allMessages[0].message : '';
              const unreadMessages = clientChat.filter(msg => !msg.read).length;

              const chatIndex = chatsList.findIndex(chat => chat.clientId === client.client_id);
              if (chatIndex > -1) {
                chatsList[chatIndex] = {
                  clientId: client.client_id,
                  clientName: client.full_name,
                  clientPhoto: client.profile_photo_url,
                  lastMessage,
                  unreadMessages
                };
              } else {
                chatsList.push({
                  clientId: client.client_id,
                  clientName: client.full_name,
                  clientPhoto: client.profile_photo_url,
                  lastMessage,
                  unreadMessages
                });
              }

              setChats([...chatsList]);
            }
          });
        } catch (error) {
          console.error('Error fetching chat document:', error);
        }
      });
    });
  };

  const handleChatClick = async (clientId) => {
    navigate(`/agent-client-chat/${clientId}`);
  };

  return (
    <div className="my-chat">
      <TopBar photoURL={agentData.photoURL} displayName={agentData.displayName} />
      
      <h2 className="my-chat-title">My Chats</h2>
      
      <div className="chat-list">
        {chats.map((chat) => (
          <div key={chat.clientId} className="chat-item-mc" onClick={() => handleChatClick(chat.clientId)}>
            <img src={chat.clientPhoto} alt="Client" className="client-photo" />
            <div className="chat-info">
              <p className="client-name">{chat.clientName}</p>
              <p className="last-message">{chat.lastMessage.substring(0, 50)}</p>
            </div>
            {chat.unreadMessages > 0 && (
              <div className="unread-count">{chat.unreadMessages}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyChat;
