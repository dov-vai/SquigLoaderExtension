import {findFilesInPhoneBook, loadExternalFile} from "@/entrypoints/content/data.ts";
import {handleShowPhone} from "@/entrypoints/content/adapter.ts";
import {Phone} from "@/entrypoints/content/types.ts";

const ADD_BUTTON_CLASS = "add-phone-button";
const BUTTON_COLOR = "var(--background-color-contrast-more)";
const ALT_BUTTON_COLOR = "var(--background-color-contrast)";
const EXPANDED_CONTAINER_COLOR = "rgba(0, 0, 0, 0.1)";
const ADD_SYMBOL = "+";
const REMOVE_SYMBOL = "-";
const EXPAND_SYMBOL = "▲";
const HIDE_SYMBOL = "▼";
const WARNING_SYMBOL = "!";

function createListButton() {
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

function createAddButton() {
    const addButton = createListButton();
    addButton.textContent = ADD_SYMBOL;
    addButton.classList.add(ADD_BUTTON_CLASS);
    return addButton;
}

function createExpandButton() {
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
    expandButton.addEventListener('click', async () => {
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

export function addShowPhoneButton(fauxnItem: HTMLElement, phoneBookLoaded: boolean) {
    const addButton = createAddButton()
    fauxnItem.appendChild(addButton);

    const [brandName, phoneName] = fauxnItem.getAttribute('name')!.split(': ').map(s => s.trim());
    const fauxnLink = fauxnItem.querySelector('a.fauxn-link') as HTMLLinkElement;
    const siteUrl = fauxnLink.href.split('/?share=')[0] + '/';
    const fileName = fauxnLink.href.split('/?share=')[1].replace(/_/g, " ");

    addButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!phoneBookLoaded) {
            findFilesInPhoneBook(siteUrl, fileName)
                .then(files => {
                    files = files.filter(file => file != fileName);
                    if (files.length > 0) {
                        addFauxnItemsToParent(fauxnItem, siteUrl, files);
                    }
                    phoneBookLoaded = true;
                });
        }

        let phoneObj: Phone = {
            brand: null,
            dispBrand: brandName,
            phone: phoneName,
            dispName: phoneName,
            fullName: brandName + " " + phoneName,
            rawChannels: null,
            active: true
        };

        phoneObj.brand = {
            active: false,
            name: brandName,
            phoneObjs: [phoneObj],
            phones: [],
        };

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