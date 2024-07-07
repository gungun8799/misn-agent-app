import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import '../SystemApprove/system-approve.css';
import TopBar from '../TopBar';
import BottomBar from '../BottomBar';
import { FaArrowLeft } from 'react-icons/fa'; // Import Font Awesome icon

const SystemApprove = ({ setDirection }) => {
  const [applications, setApplications] = useState({ preApproved: [], preRejected: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [agentData, setAgentData] = useState({});
  const [filter, setFilter] = useState('preApproved'); // Filter state
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

      const preApprovedQuery = query(
        collection(db, 'Applications'),
        where('auto_filled_form_data.client_id', 'in', clientIds),
        where('auto_filled_form_data.status', 'in', ['submitted', 'request_docs'])
      );
      const preRejectedQuery = query(
        collection(db, 'Applications'),
        where('auto_filled_form_data.client_id', 'in', clientIds),
        where('auto_filled_form_data.status', 'in', ['rejected'])
      );

      const [preApprovedSnapshot, preRejectedSnapshot] = await Promise.all([
        getDocs(preApprovedQuery),
        getDocs(preRejectedQuery)
      ]);

      console.log('Pre-approved applications:', preApprovedSnapshot.docs);
      console.log('Unqualified applications:', preRejectedSnapshot.docs);

      const preApproved = await Promise.all(preApprovedSnapshot.docs.map(async (doc) => {
        const application = doc.data();
        const clientQuery = query(collection(db, 'Clients'), where('client_id', '==', application.auto_filled_form_data.client_id));
        const clientSnapshot = await getDocs(clientQuery);
        const client = clientSnapshot.docs[0]?.data();
        console.log('Pre-approved application client data:', client);
        return {
          id: doc.id,
          fullName: client.full_name,
          program: application.system_suggest_program,
          summary: application.application_summary,
          date: application.auto_filled_form_data.created_at.toDate().toLocaleString()
        };
      }));

      const preRejected = await Promise.all(preRejectedSnapshot.docs.map(async (doc) => {
        const application = doc.data();
        const clientQuery = query(collection(db, 'Clients'), where('client_id', '==', application.auto_filled_form_data.client_id));
        const clientSnapshot = await getDocs(clientQuery);
        const client = clientSnapshot.docs[0]?.data();
        console.log('Pre-rejected application client data:', client);
        return {
          id: doc.id,
          fullName: client.full_name,
          reason: application.auto_filled_form_data.pre_rejected_reason,
          summary: application.application_summary,
          date: application.auto_filled_form_data.created_at.toDate().toLocaleString()
        };
      }));

      setApplications({ preApproved, preRejected });
      setIsLoading(false);
      console.log('Applications state:', { preApproved, preRejected });
    } catch (error) {
      console.error('Error fetching applications:', error);
      setIsLoading(false);
    }
  };

  const handleApplicationClick = (id, type) => {
    setDirection('forward');
    if (type === 'approved') {
      navigate(`/detail-pre-approve/${id}`);
    } else if (type === 'rejected') {
      navigate(`/detail-pre-reject/${id}`);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="system-approve">
       <button className="back-button-SP" onClick={() => navigate(-1)}>
        <FaArrowLeft className="back-icon" /> Back</button>
      <div className="filter-buttons">
        <button className={`filter-button ${filter === 'preApproved' ? 'active' : ''}`} onClick={() => setFilter('preApproved')}>Applications</button>
        <button className={`filter-button ${filter === 'preRejected' ? 'active' : ''}`} onClick={() => setFilter('preRejected')}>Unqualified</button>
      </div>
      {filter === 'preApproved' && (
        <>
          <div className="applications-list">
            {applications.preApproved.map(application => (
              <div key={application.id} className="application-item-SP" onClick={() => handleApplicationClick(application.id, 'approved')}>
               <h4 className="application-id-header-title" >Application ID: {application.id}</h4>
                <div className="application-header">
                  
                  <h3>{application.fullName}</h3>
                  <span className="application-date">{application.date}</span>
                </div>
                <p className="application-program">{application.program}</p>
                <p className="application-summary">{application.summary}</p>
              </div>
            ))}
          </div>
        </>
      )}
      {filter === 'preRejected' && (
        <>
          <div className="applications-list">
            {applications.preRejected.map(application => (
              <div key={application.id} className="application-item rejected-SP" onClick={() => handleApplicationClick(application.id, 'rejected')}>
                <h4 className="application-id-header-title" >Application ID: {application.id}</h4>
                <div className="application-header">
                  <h3>{application.fullName}</h3>
                  <span className="application-date">{application.date}</span>
                </div>
                <p className="application-reason">{application.reason}</p>
                <p className="application-summary">{application.summary}</p>
              </div>
            ))}
          </div>
        </>
      )}
      <BottomBar />
    </div>
  );
};

export default SystemApprove;
