import {addShowPhoneButton} from "@/entrypoints/content/ui.ts";

export default defineUnlistedScript(() => {
    // watch for changes in div#phones
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
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
})