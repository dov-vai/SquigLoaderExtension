import './App.css';

function App() {
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        browser.storage.local.get('extensionEnabled').then((result) => {
            setIsActive(result.extensionEnabled !== undefined ? result.extensionEnabled : true);
        })
    })

    const buttonClicked = async () => {
        const newState = !isActive;
        setIsActive(newState);
        browser.storage.local.set({extensionEnabled: newState});
    }

    return (
        <>
            <p>SquigLoader</p>
            <button onClick={buttonClicked}>{isActive ? 'Disable' : 'Enable'}</button>
        </>
    );
}

export default App;
