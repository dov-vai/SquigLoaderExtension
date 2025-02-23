export default defineContentScript({
  matches: [
    'https://*.squig.link/*',
    'https://graph.hangout.audio/*'
  ],
  world: "MAIN",
  main() {
    const ADD_BUTTON_CLASS = "add-phone-button";
    const BUTTON_COLOR = "var(--background-color-contrast-more)";
    const ALT_BUTTON_COLOR = "var(--background-color-contrast)";
    const EXPANDED_CONTAINER_COLOR = "rgba(0, 0, 0, 0.1)";
    const ADD_SYMBOL = "+";
    const REMOVE_SYMBOL = "-";
    const EXPAND_SYMBOL = "▲";
    const HIDE_SYMBOL = "▼";
    const WARNING_SYMBOL = "!";

    function createListButton(){
        const button = document.createElement('button');

        let buttonColor = BUTTON_COLOR;
        // fix for crinacle's site, because the button is invisible
         if (window.location.href.startsWith("https://graph.hangout.audio/")) {
             buttonColor = ALT_BUTTON_COLOR;
         }

        button.style.cssText = `
    margin-right: 10px;
    font-size: 24px;
    border-radius: 50%;
    color: ${buttonColor};
    background-color: transparent;
    border: 1px solid ${buttonColor};
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
`;
        return button;
    }

    function createAddButton(){
        const addButton = createListButton();
        addButton.textContent = ADD_SYMBOL;
        addButton.classList.add(ADD_BUTTON_CLASS);
        return addButton;
    }

    function createExpandButton(){
        const expandButton = createListButton();
        expandButton.textContent = EXPAND_SYMBOL;
        expandButton.classList.add("expand-phones-button");
        expandButton.style.fontSize = "12px";
        return expandButton;
    }

    function addFauxnItemsToParent(fauxnItem: HTMLElement, siteUrl: string, files: string[]) {
        const clonedItem = fauxnItem.cloneNode(true);
        const parent = fauxnItem.parentNode!;

        const linksContainer = document.createElement('div');
        linksContainer.style.display = 'none';
        linksContainer.style.backgroundColor = EXPANDED_CONTAINER_COLOR;

        const expandButton = createExpandButton();
        fauxnItem.appendChild(expandButton);

        let expanded = false;
        expandButton.addEventListener('click', async (event) => {
            linksContainer.style.display = expanded ? 'none' : 'block';
            expandButton.textContent = expanded ? EXPAND_SYMBOL : HIDE_SYMBOL;
            expanded = !expanded;
        });

        files.forEach(file => {
            const newFauxnItem = clonedItem.cloneNode(true) as HTMLElement;
            
            const brand = fauxnItem.getAttribute('name')!.split(': ')[0];
            newFauxnItem.setAttribute('name', `${brand}: ${file}`);

            // remove the old cloned button
            const button = newFauxnItem.querySelector(`button.${ADD_BUTTON_CLASS}`) as Node;
            newFauxnItem.removeChild(button);

            const newFauxnLink = newFauxnItem.querySelector('a.fauxn-link') as HTMLLinkElement;
            newFauxnLink.href = `${siteUrl}?share=${file.replace(/ /g, "_")}`;
            newFauxnLink.textContent = file;

            addShowPhoneButton(newFauxnItem, true);
            linksContainer.appendChild(newFauxnItem);
        });

        parent.insertBefore(linksContainer, fauxnItem.nextSibling);
    }

    function addShowPhoneButton(fauxnItem: HTMLElement, phoneBookLoaded: boolean) {
        const addButton = createAddButton()
        fauxnItem.appendChild(addButton);

        const [brandName, phoneName] = fauxnItem.getAttribute('name')!.split(': ').map(s => s.trim());
        const fauxnLink = fauxnItem.querySelector('a.fauxn-link') as HTMLLinkElement;
        const siteUrl = fauxnLink.href.split('/?share=')[0] + '/';
        const fileName = fauxnLink.href.split('/?share=')[1].replace(/_/g, " ");

        addButton.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (!phoneBookLoaded){
                findFilesInPhoneBook(siteUrl, fileName)
                .then(files => {
                    files = files.filter(file => file != fileName);
                    if (files.length > 0) {
                        addFauxnItemsToParent(fauxnItem, siteUrl, files);
                    }
                    phoneBookLoaded = true;
                });
            }
            
            let phoneObj = {
                brand: null as any,
                dispBrand: brandName,
                phone: phoneName,
                dispName: phoneName,
                fullName: brandName + " " + phoneName,
                rawChannels: null,
                active: true
            };

            let brandObj = {
                active: false,
                name: brandName,
                phoneObjs: [phoneObj],
                phones: [],
            };

            phoneObj.brand = brandObj;

            try {
                const phoneIndex = allPhones.findIndex(
                    (p: any) => p.dispBrand === phoneObj.dispBrand && p.dispName === phoneObj.dispName
                );

                if (phoneIndex === -1) {
                    await loadExternalFile(phoneObj, siteUrl, fileName);
                    allPhones.push(phoneObj);
                    handleShowPhone(phoneObj, false, undefined, undefined);
                    addButton.textContent = '–';
                    return;
                }
                // if it exists, reference the already created phoneObj
                phoneObj = allPhones[phoneIndex];
                phoneObj.active ? removePhone(phoneObj) : handleShowPhone(phoneObj, false, undefined, undefined);
                addButton.textContent = phoneObj.active ? REMOVE_SYMBOL : ADD_SYMBOL;
            } catch (error) {
                console.error('Error loading data for', phoneName, error);
                addButton.textContent = WARNING_SYMBOL;
            }
        });
    }

    function handleShowPhone(p: any, exclusive: any, suppressVariant: any, trigger: any){
        try {
            showPhone(p, exclusive, suppressVariant, trigger);
        } catch (error) {
            // ignore this error, showPhone handles list view updating too, however it's not needed for us and causes this error
            if (error instanceof TypeError 
                && (error.message.includes("phoneListItem is null")
                || error.message.includes("Cannot read properties of null"))
            ) {
                console.warn("Ignoring TypeError: phoneListItem is null");
            } else {
                throw error;
            }
        }
    }

    function interpolateData(channelFiles: string[]) {
        return channelFiles.map(data => {
            if (data) {
                const parsedData = tsvParse(data);
                return Equalizer.interp(f_values, parsedData);
            } else {
                return null;
            }
        }).filter(channel => channel !== null);
    }

    function fetchFile(url: string, channelFiles: string[], fileName: string){
        return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            console.log("channel file", data);
            channelFiles.push(data);
        })
        .catch(error => {
            console.error('Error fetching data for', fileName, error);
            throw error;
        })
    }

    async function findFilesInPhoneBook(siteUrl: string, fileName: string): Promise<string[]> {
        const phoneBookUrl = `${siteUrl}data/phone_book.json`;
      
        try {
          const response = await fetch(phoneBookUrl);
      
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
      
          const phoneBook = await response.json();
      
          for (const entry of phoneBook){
            for (const phone of entry.phones){
                if (phone.file instanceof Array){
                    if (phone.file.includes(fileName)){
                        return phone.file;
                    }
                } else {
                    if (phone.file === fileName){
                        return [ phone.file ];
                    }
                }
            }
          }
      
          return [];
        } catch (error) {
          console.error('Error fetching or parsing phone_book.json:', error);
          return [];
        }
    }

    async function loadExternalFile(phoneObj: any, siteUrl: string, fileName: string) {
        if (phoneObj.rawChannels) {
            console.log("Data already loaded for:", phoneObj.dispName);
            return; // do nothing if data is already loaded
        }

        const channelFiles: string[] = [];
        const promises: Promise<void>[] = [];
        const retryPromises: Promise<void>[] = [];

        for (const channel of ["L", "R"]) {
            const fullFileName = `${fileName} ${channel}.txt`;
            const dataUrl = `${siteUrl}data/${encodeURIComponent(fullFileName)}`;

            const promise = fetchFile(dataUrl, channelFiles, fullFileName)
            .catch(_ => {
                // many headphone squigs rely on a few measurements to get a more accurate average
                // and a number is included in the link, so let's try fetching them
                if (!siteUrl.toLowerCase().includes("/headphones/")){
                    return;
                }

                for (let i = 1; i <= 6; i++){
                    const fullFileName = `${fileName} ${channel}${i}.txt`;
                    const dataUrl = `${siteUrl}data/${encodeURIComponent(fullFileName)}`;

                    const promise = fetchFile(dataUrl, channelFiles, fullFileName)
                    // we don't care if other requests after it fail, because the number of measurements is not strict
                    // 6 is the largest i've seen
                    .catch(_ => {});

                    retryPromises.push(promise);
                }
            });

            promises.push(promise);
        }

        await Promise.all(promises);
        await Promise.all(retryPromises);

        phoneObj.rawChannels = interpolateData(channelFiles);
    }

    // watch for changes in div#phones
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    // FIXME: classList does exist, why is typescript showing an error?
                    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList.contains('fauxn-item')) {
                        addShowPhoneButton(node as HTMLElement, false);
                    }
                });
            }
        }
    });

    const phonesDiv = document.querySelector('div#phones');
    if (phonesDiv) {
        observer.observe(phonesDiv, { childList: true, subtree: true });
    } else {
        console.error('Could not find div#phones');
    }
  },
});
