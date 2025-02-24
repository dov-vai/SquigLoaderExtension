export function handleShowPhone(p: any, exclusive: any, suppressVariant: any, trigger: any) {
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