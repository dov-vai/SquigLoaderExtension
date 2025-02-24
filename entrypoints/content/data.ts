export function interpolateData(channelFiles: string[]) {
    return channelFiles.map(data => {
        if (data) {
            const parsedData = tsvParse(data);
            return Equalizer.interp(f_values, parsedData);
        } else {
            return null;
        }
    }).filter(channel => channel !== null);
}

export async function fetchFile(url: string, fileName: string, channelData: string[]) {
    try {
        let response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let data: string = await response.text();
        channelData.push(data);
    } catch (error) {
        console.error('Error fetching data for', fileName, error);
        throw error;
    }
}

export async function findFilesInPhoneBook(siteUrl: string, fileName: string): Promise<string[]> {
    const phoneBookUrl = `${siteUrl}data/phone_book.json`;

    try {
        const response = await fetch(phoneBookUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const phoneBook = await response.json();

        for (const entry of phoneBook) {
            for (const phone of entry.phones) {
                if (phone.file instanceof Array) {
                    if (phone.file.includes(fileName)) {
                        return phone.file;
                    }
                } else {
                    if (phone.file === fileName) {
                        return [phone.file];
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

export async function loadExternalFile(phoneObj: any, siteUrl: string, fileName: string) {
    if (phoneObj.rawChannels) {
        console.log("Data already loaded for:", phoneObj.dispName);
        return; // do nothing if data is already loaded
    }

    const channelData: string[] = [];
    const promises: Promise<void>[] = [];
    const retryPromises: Promise<void>[] = [];

    for (const channel of ["L", "R"]) {
        const fullFileName = `${fileName} ${channel}.txt`;
        const dataUrl = `${siteUrl}data/${encodeURIComponent(fullFileName)}`;

        const promise = fetchFile(dataUrl, fullFileName, channelData)
            .catch(_ => {
                // many headphone squigs rely on a few measurements to get a more accurate average
                // and a number is included in the link, so let's try fetching them
                if (!siteUrl.toLowerCase().includes("/headphones/")) {
                    return;
                }

                for (let i = 1; i <= 6; i++) {
                    const fullFileName = `${fileName} ${channel}${i}.txt`;
                    const dataUrl = `${siteUrl}data/${encodeURIComponent(fullFileName)}`;

                    const promise = fetchFile(dataUrl, fullFileName, channelData)
                        // we don't care if other requests after it fail, because the number of measurements is not strict
                        // 6 is the largest i've seen
                        .catch(_ => {
                        });

                    retryPromises.push(promise);
                }
            });

        promises.push(promise);
    }

    await Promise.all(promises);
    await Promise.all(retryPromises);

    phoneObj.rawChannels = interpolateData(channelData);
}