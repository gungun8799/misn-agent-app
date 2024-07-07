import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import TopBar from '../TopBar';
import BottomBar from '../BottomBar';
import './client-profile.css';

const ClientProfile = ({ setDirection }) => {
  const [agentData, setAgentData] = useState({});
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
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
            fetchClients(agent.displayName);
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

  const fetchClients = async (agentName) => {
    try {
      const clientsQuery = query(collection(db, 'Clients'), where('assigned_agent_id', '==', agentName));
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientsList = clientsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setClients(clientsList);
      setFilteredClients(clientsList); // Initialize filteredClients
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleClientClick = (id) => {
    setDirection('forward');
    navigate(`/detail-client-profile/${id}`);
  };

  const handleSearch = (event) => {
    const searchValue = event.target.value.toLowerCase();
    setSearchTerm(searchValue);

    const filteredList = clients.filter(client =>
      client.full_name.toLowerCase().includes(searchValue)
    );
    setFilteredClients(filteredList);
  };

  return (
    <div className="client-profile">
      <TopBar photoURL={agentData.photoURL} displayName={agentData.displayName} setDirection={setDirection} />
      <div className="search-bar-CP">
        <input className="search-input-CP" type="text" placeholder="Search" value={searchTerm} onChange={handleSearch} />
        <button>Search</button>
      </div>
      <h2 className= "client-profile-title-CP">Client Profile</h2>
      <div className="client-list">
        {filteredClients.map((client) => (
          <div key={client.id} className="client-item" onClick={() => handleClientClick(client.id)}>
            <span>{client.full_name}</span>
          </div>
        ))}
      </div>
      <BottomBar />
    </div>
  );
};

export default ClientProfile;
