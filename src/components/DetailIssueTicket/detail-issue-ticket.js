import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import TopBar from '../TopBar';
import BottomBar from '../BottomBar';
import './detail-issue-ticket.css';
import BackButton from '../BackButton/back-button.js';

const DetailIssueTicket = ({ setDirection }) => {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState({});
  const [clientName, setClientName] = useState('');
  const [message, setMessage] = useState('');
  const [agentData, setAgentData] = useState({});
  const navigate = useNavigate();
  const chatLogRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const agentQuery = doc(db, 'Agents', user.uid);
          const agentSnapshot = await getDoc(agentQuery);
          if (agentSnapshot.exists()) {
            setAgentData(agentSnapshot.data());
            await fetchTicket();
          } else {
            console.error('Agent document does not exist');
          }
        } catch (error) {
          console.error('Error fetching agent document:', error);
        }
      }
    });

    return () => unsubscribe();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const ticketRef = doc(db, 'Tickets', ticketId);
      const ticketSnap = await getDoc(ticketRef);
      if (ticketSnap.exists()) {
        const ticketData = ticketSnap.data();

        // Fetch the client name based on the client_id in the ticket data
        const clientQuery = query(collection(db, 'Clients'), where('client_id', '==', ticketData.client_id));
        const clientSnapshot = await getDocs(clientQuery);
        if (!clientSnapshot.empty) {
          const client = clientSnapshot.docs[0].data();
          setClientName(client.full_name);
        }

        // Check if issue_description is already in chat_log
        const issueInChatLog = ticketData.chat_log && ticketData.chat_log.some(log => log.message === ticketData.issue_description);

        // Push initial issue description to chat_log if not already present
        if (!issueInChatLog) {
          const issueDescriptionLog = {
            message: ticketData.issue_description,
            timestamp: Timestamp.now(),
            sender: ticketData.client_id
          };

          await updateDoc(ticketRef, {
            chat_log: arrayUnion(issueDescriptionLog),
            updated_at: Timestamp.now()
          });

          setTicket({
            ...ticketData,
            chat_log: [...(ticketData.chat_log || []), issueDescriptionLog]
          });
        } else {
          setTicket(ticketData);
        }
      } else {
        console.error('No such ticket!');
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
    }
  };

  const handlePostComment = async () => {
    if (message.trim() === '') return;

    try {
      const ticketRef = doc(db, 'Tickets', ticketId);
      const newMessage = {
        message: message,
        timestamp: Timestamp.now(),
        sender: agentData.displayName
      };
      await updateDoc(ticketRef, {
        chat_log: arrayUnion(newMessage),
        updated_at: Timestamp.now()
      });
      setTicket((prevTicket) => ({
        ...prevTicket,
        chat_log: [...prevTicket.chat_log, newMessage]
      }));
      setMessage('');
      // Scroll to the bottom of the chat log
      if (chatLogRef.current) {
        chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleCloseTicket = async () => {
    try {
      const ticketRef = doc(db, 'Tickets', ticketId);
      await updateDoc(ticketRef, {
        status: 'closed',
        updated_at: Timestamp.now()
      });
      setDirection('back');
      navigate('/home');
    } catch (error) {
      console.error('Error closing ticket:', error);
    }
  };

  useEffect(() => {
    // Scroll to the bottom of the chat log initially
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [ticket]);

  return (
    <div className="detail-issue-ticket">
      <BackButton />
      <div className="ticket-detail">
        <div className="client-response">
          <div className="client-info">
            <img src="profile_photo_url" alt="Client" />
            <span>{clientName} ({ticketId})</span>
          </div>
        </div>
        <div className="chat-log" ref={chatLogRef}>
          {ticket.chat_log && ticket.chat_log.map((log, index) => (
            <div 
              key={index} 
              className={`chat-message-issue ${log.sender === agentData.displayName ? 'agent-message' : 'client-message'}`}
            >
              <span>{log.message}</span>
              <span className="timestamp">{log.timestamp.toDate().toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="agent-response">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your response here..."
          />
          <button onClick={handlePostComment}>Post Comment</button>
          <button onClick={handleCloseTicket}>Close Ticket</button>
        </div>
      </div>
      <BottomBar />
    </div>
  );
};

export default DetailIssueTicket;
