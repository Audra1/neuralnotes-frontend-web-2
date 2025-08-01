import { useNavigate } from 'react-router-dom';
import './QuickNoteButton.css';
import quicknoteicon from '../../../assets/quicknoteicon.png'; 

export default function QuickNoteButton({ isActive = false }) {
  const navigate = useNavigate();

  const HandleButtonClick = () => {

    try {
      navigate(`/quick-notes/today`);
    } catch (error) {
      console.error('Error accessing Quick Notes:', error);
  };}

  return (
    <div className='quick-note-div'>
      <button 
        onClick={HandleButtonClick}
        className={`quick-note-button${isActive ? ' active' : ''}`}
        title="Quick Note"
      >
        <img src={quicknoteicon} alt="Find" className="quick-note-icon"/>
        Quick Note
      </button>
    </div>
  );
}