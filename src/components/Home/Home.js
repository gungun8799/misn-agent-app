import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './Home.css';
import TopBar from '../TopBar';
import BottomBar from '../BottomBar';

function Home() {
  const [agentData, setAgentData] = useState(null);
  const [pendingTasks, setPendingTasks] = useState({
    applicationApproval: 0,
    serviceMatching: 0,
    serviceDelivery: 0,
    routineCheckup: 0,
  });
  const [serviceIssuesCount, setServiceIssuesCount] = useState(0);
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
            await fetchPendingTasks(agent.displayName);
            await fetchServiceIssues(agent.displayName);
          } else {
            console.error('Agent document does not exist');
            navigate('/login');
          }
        } catch (error) {
          console.error('Error fetching agent document:', error);
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchPendingTasks = async (agentName) => {
    try {
      const clientsQuery = query(collection(db, 'Clients'), where('assigned_agent_id', '==', agentName));
      const clientSnapshot = await getDocs(clientsQuery);
      const clientIds = clientSnapshot.docs.map(doc => doc.data().client_id).filter(id => id);

      console.log('Client IDs:', clientIds); // Log the client IDs to verify they are valid

      if (clientIds.length === 0) {
        console.warn('No client IDs found for agent:', agentName);
        return;
      }

      const applicationQuery = query(collection(db, 'Applications'), where('auto_filled_form_data.client_id', 'in', clientIds), where('auto_filled_form_data.status', 'in', ['submitted', 'request_docs']));
      const applicationSnapshot = await getDocs(applicationQuery);
      const applicationCount = applicationSnapshot.docs.length;

      const serviceQuery = query(collection(db, 'Applications'), where('auto_filled_form_data.client_id', 'in', clientIds), where('auto_filled_form_data.status', 'in', ['approved']));
      const serviceSnapshot = await getDocs(serviceQuery);
      const serviceCount = serviceSnapshot.docs.length;

      const serviceDeliveryQuery = query(collection(db, 'Applications'), where('auto_filled_form_data.client_id', 'in', clientIds), where('auto_filled_form_data.status', '==', 'service_submitted'));
      const serviceDeliverySnapshot = await getDocs(serviceDeliveryQuery);
      const serviceDeliveryCount = serviceDeliverySnapshot.docs.length;

      const routineCheckupQuery = query(collection(db, 'Visits'), where('client_id', 'in', clientIds), where('status', '==', 'proposed'));
      const routineCheckupSnapshot = await getDocs(routineCheckupQuery);
      const routineCheckupCount = routineCheckupSnapshot.docs.length;

      setPendingTasks({
        applicationApproval: applicationCount,
        serviceMatching: serviceCount,
        serviceDelivery: serviceDeliveryCount,
        routineCheckup: routineCheckupCount,
      });
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
    }
  };

  const fetchServiceIssues = async (agentName) => {
    try {
      const clientsQuery = query(collection(db, 'Clients'), where('assigned_agent_id', '==', agentName));
      const clientSnapshot = await getDocs(clientsQuery);
      const clientIds = clientSnapshot.docs.map(doc => doc.data().client_id).filter(id => id);

      console.log('Client IDs for service issues:', clientIds); // Log the client IDs to verify they are valid

      if (clientIds.length === 0) {
        console.warn('No client IDs found for agent:', agentName);
        return;
      }

      const ticketsQuery = query(collection(db, 'Tickets'), where('client_id', 'in', clientIds), where('status', '==', 'open'));
      const ticketSnapshot = await getDocs(ticketsQuery);
      const issues = ticketSnapshot.docs.map(doc => doc.data().issue_description);
      setServiceIssuesCount(issues.length);
    } catch (error) {
      console.error('Error fetching service issues:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Logout failed. Please try again.');
    }
  };

  if (!agentData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="home-container">
      <TopBar photoURL={agentData.photoURL} displayName={agentData.displayName} />
      <div className="dashboard">
        <h2 className="dashboard-title">Dashboard</h2>
        <div className="pending-tasks">
          <h3>Pending tasks</h3>
          <div className="task-grid">
            <div className="task-card" onClick={() => navigate('/SystemApprove')}>
              <div className="task-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="task-details">
                <span className="task-count">{pendingTasks.applicationApproval}</span>
                <span className="task-name">Wait for approval</span>
              </div>
            </div>
            <div className="task-card" onClick={() => navigate('/ServiceMatching')}>
              <div className="task-icon">
                <i className="fas fa-exchange-alt"></i>
              </div>
              <div className="task-details">
                <span className="task-count">{pendingTasks.serviceMatching}</span>
                <span className="task-name">Service Matching</span>
              </div>
            </div>
            <div className="task-card" onClick={() => navigate('/ServiceDelivery')}>
              <div className="task-icon">
                <i className="fas fa-truck"></i>
              </div>
              <div className="task-details">
                <span className="task-count">{pendingTasks.serviceDelivery}</span>
                <span className="task-name">Service Delivery confirmation</span>
              </div>
            </div>
            <div className="task-card" onClick={() => navigate(`/visit-schedule/${agentData.clientId}`)}>
              <div className="task-icon">
                <i className="fas fa-calendar-check"></i>
              </div>
              <div className="task-details">
                <span className="task-count">{pendingTasks.routineCheckup}</span>
                <span className="task-name">Routine checkup</span>
              </div>
            </div>
          </div>
        </div>
        <div className="service-issues-summary" onClick={() => navigate('/IssueTicket/')}>
          <div className="issue-count">
            <i className="fas fa-exclamation-circle"></i> {serviceIssuesCount}
          </div>
          <div className="issue-text">Service issue tickets</div>
        </div>
      </div>
      <BottomBar />
      <button className="logout-button" onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Home;
