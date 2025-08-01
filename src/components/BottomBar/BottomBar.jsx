



export default function BottomBar () {

  // Identifies if It's on Quick Note, or FilePage.
  PageIdentifier () = {

  }

  return
  <div className="BottomBarBackground"> 
      {PageIdentifier} : {
        // if Quick Note, than show: <p>(Enter)</p> <p>Quick Note</p>
        // if FilePage, than show: <p>(Enter)</p> <p>New Note</p>
      }
    
  </div>
}