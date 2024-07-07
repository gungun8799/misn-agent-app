import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import TopBar from '../TopBar';
import BottomBar from '../BottomBar';
import './service-delivery.css';
import BackButton from '../BackButton/back-button.js';

const ServiceDelivery = ({ setDirection }) => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [agentData, setAgentData] = useState({});
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
            await fetchApplications(agent.displayName);
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

  const fetchApplications = async (displayName) => {
    try {
      console.log('Fetching clients for agent:', displayName);
      const clientsQuery = query(collection(db, 'Clients'), where('assigned_agent_id', '==', displayName));
      const clientSnapshot = await getDocs(clientsQuery);
      const clientIds = clientSnapshot.docs.map(doc => doc.data().client_id).filter(id => id); // Filter out undefined values
      console.log('Client IDs:', clientIds);

      if (clientIds.length === 0) {
        setIsLoading(false);
        return;
      }

      const serviceSubmittedQuery = query(
        collection(db, 'Applications'),
        where('auto_filled_form_data.client_id', 'in', clientIds),
        where('auto_filled_form_data.status', '==', 'service_submitted')
      );

      const serviceSubmittedSnapshot = await getDocs(serviceSubmittedQuery);
      const serviceSubmittedApplications = await Promise.all(serviceSubmittedSnapshot.docs.map(async (doc) => {
        const application = doc.data();
        const clientQuery = query(collection(db, 'Clients'), where('client_id', '==', application.auto_filled_form_data.client_id));
        const clientSnapshot = await getDocs(clientQuery);
        const client = clientSnapshot.docs[0]?.data();
        return {
          id: doc.id,
          fullName: client?.full_name || 'Unknown Client',
          finalProgramName: application.auto_filled_form_data.final_program_name,
          status: application.auto_filled_form_data.status
        };
      }));

      setApplications(serviceSubmittedApplications);
      setIsLoading(false);
      console.log('Service submitted applications:', serviceSubmittedApplications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setIsLoading(false);
    }
  };

  const handleApplicationClick = (id) => {
    setDirection('forward');
    navigate(`/detail-service-delivery/${id}`);
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="service-delivery">
      <BackButton />
      <h2 className="service-delivery-title">Service Delivery</h2>
      <div className="applications-list">
        {applications.length === 0 ? (
          <p>No services found.</p>
        ) : (
          applications.map(application => (
            <div key={application.id} className="application-item-SD" onClick={() => handleApplicationClick(application.id)}>
              <div className="application-id-header">
                <h3>Application ID: {application.id}</h3>
              </div>
              <div className="application-header">
                <h3>{application.fullName}</h3>
                <span className="application-program">{application.finalProgramName}</span>
              </div>
              <p className="application-status-SD">Waiting for client confirmation</p>
            </div>
          ))
        )}
      </div>
      <BottomBar />
    </div>
  );
};

export default ServiceDelivery;
