import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import BottomBar from '../BottomBar';
import './service-matching.css';
import BackButton from '../BackButton/back-button.js';

const ServiceMatching = ({ setDirection }) => {
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
        console.warn('No client IDs found for agent:', displayName);
        setIsLoading(false);
        return;
      }

      const approvedQuery = query(
        collection(db, 'Applications'),
        where('auto_filled_form_data.client_id', 'in', clientIds),
        where('auto_filled_form_data.status', 'in', ['approved'])
      );

      const approvedSnapshot = await getDocs(approvedQuery);
      const approvedApplications = await Promise.all(approvedSnapshot.docs.map(async (doc) => {
        const application = doc.data();
        const clientQuery = query(collection(db, 'Clients'), where('client_id', '==', application.auto_filled_form_data.client_id));
        const clientSnapshot = await getDocs(clientQuery);
        const client = clientSnapshot.docs[0]?.data();
        return {
          id: doc.id,
          fullName: client.full_name,
          finalProgramName: application.auto_filled_form_data.final_program_name,
          matchedServices: application.system_matched_services || []  // Ensure it's an array
        };
      }));

      setApplications(approvedApplications);
      setIsLoading(false);
      console.log('Approved applications:', approvedApplications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setIsLoading(false);
    }
  };

  const fetchServiceLink = async (programName, service) => {
    try {
      const servicesQuery = query(collection(db, 'Services'));
      const servicesSnapshot = await getDocs(servicesQuery);
      let serviceLink = '';

      console.log(`Looking for program: ${programName}, service: ${service}`);
      servicesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`Service document data: ${JSON.stringify(data)}`);
        const lowerProgramName = programName.toLowerCase();
        const lowerService = service.toLowerCase();

        Object.keys(data).forEach(key => {
          if (key.toLowerCase() === lowerProgramName) {
            Object.keys(data[key]).forEach(subKey => {
              if (subKey.toLowerCase() === lowerService) {
                serviceLink = data[key][subKey];
              }
            });
          }
        });
      });

      if (serviceLink) {
        console.log(`Service link found: ${serviceLink}`);
        window.open(serviceLink, '_blank');
      } else {
        console.error('Service link not found');
      }
    } catch (error) {
      console.error('Error fetching service link:', error);
    }
  };

  const handleServiceClick = (programName, service) => {
    fetchServiceLink(programName, service);
  };

  const handleApplicationClick = (id) => {
    setDirection('forward');
    navigate(`/detail-service-matching/${id}`);
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="service-matching">
      <BackButton />
      <h2>System Service Matching</h2>
      <div className="applications-list">
        {applications.map(application => (
          <div key={application.id} className="application-item" onClick={() => handleApplicationClick(application.id)}>
            <div className="application-id-header">
              <h3>Application ID: {application.id}</h3>
            </div>
            <div className="application-header">
              <h3>{application.fullName}</h3>
              <span className="application-program">{application.finalProgramName}</span>
            </div>
            <p className="matched-services">Matched services</p>
            <div className="services-list">
              {application.matchedServices.map((service, index) => (
                <span key={index} className="service" onClick={(e) => {
                  e.stopPropagation();
                  console.log(`Clicked service: ${service}`);
                  console.log(`Program name: ${application.finalProgramName}`);
                  handleServiceClick(application.finalProgramName, service);
                }}>{service}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <BottomBar />
    </div>
  );
};

export default ServiceMatching;
