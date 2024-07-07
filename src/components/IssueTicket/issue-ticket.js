import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import TopBar from '../TopBar';
import BottomBar from '../BottomBar';
import './issue-ticket.css';
import BackButton from '../BackButton/back-button.js';

const IssueTicket = ({ setDirection }) => {
  const [agentData, setAgentData] = useState({});
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [clientData, setClientData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
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
            fetchTickets(agent.displayName);
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

  const fetchTickets = async (agentName) => {
    try {
      const clientsQuery = query(collection(db, 'Clients'), where('assigned_agent_id', '==', agentName));
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientIds = clientsSnapshot.docs.map(doc => doc.data().client_id);

      const ticketsQuery = query(collection(db, 'Tickets'), where('client_id', 'in', clientIds), where('status', '==', 'open'));
      const ticketsSnapshot = await getDocs(ticketsQuery);
      const ticketsList = ticketsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      // Fetch client data
      const clientsData = {};
      clientsSnapshot.docs.forEach(doc => {
        clientsData[doc.data().client_id] = doc.data().full_name;
      });
      setClientData(clientsData);

      setTickets(ticketsList);
      setFilteredTickets(ticketsList); // Initialize filteredTickets with all tickets
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const handleTicketClick = (id) => {
    setDirection('forward');
    console.log(`Navigating to detail-issue-ticket/${id}`); // Log the navigation
    navigate(`/detail-issue-ticket/${id}`);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (e.target.value === '') {
      setFilteredTickets(tickets);
    } else {
      const lowercasedSearchTerm = e.target.value.toLowerCase();
      const filtered = tickets.filter(ticket => {
        const clientName = clientData[ticket.client_id] || '';
        return (
          clientName.toLowerCase().includes(lowercasedSearchTerm) ||
          ticket.issue_description.toLowerCase().includes(lowercasedSearchTerm) ||
          ticket.id.toString().toLowerCase().includes(lowercasedSearchTerm)
        );
      });
      setFilteredTickets(filtered);
    }
  };

  return (
    <div className="issue-ticket">
      <BackButton />
      <h2 className="issue-ticket-title">Service issue tickets</h2>
      <input
        type="text"
        className="search-bar"
        placeholder="Search tickets..."
        value={searchTerm}
        onChange={handleSearchChange}
      />
      <div className="tickets-list">
        {filteredTickets.map((ticket) => (
          <div key={ticket.id} className="ticket-item" onClick={() => handleTicketClick(ticket.id)}>
            <span className="client-name">{clientData[ticket.client_id]}</span>
            <span className="issue-description">{ticket.issue_description}</span>
            <span className="ticket-id">ID {ticket.id}</span>
          </div>
        ))}
      </div>
      <BottomBar />
    </div>
  );
};

export default IssueTicket;
