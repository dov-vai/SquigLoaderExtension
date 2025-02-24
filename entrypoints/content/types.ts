export interface Phone {
    brand: Brand | null;
    dispBrand: string;
    phone: string;
    dispName: string;
    fullName: string;
    rawChannels: null;
    active: boolean;
}

export interface Brand {
    active: boolean;
    name: string;
    phoneObjs: Phone[];
    phones: any[];
}