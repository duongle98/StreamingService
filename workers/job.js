

export class Job {
    constructor() { }

    payload() {
        throw "need to implement";
    }
}


export class ConvertHLSJob extends Job{
    constructor(aux) {
        super();
        this.fileId = aux.fileId;
        this.db = aux.db ? aux.db : "hls";
        this.inputOptions = aux.inputOptions ? aux.inputOptions : {};
        this.outputOptions = aux.outputOptions ? aux.outputOptions : {};
    }


    payload() {
        return {
            "fileId": this.fileId,
            "db": this.db,
            "inputOptions": this.inputOptions,
            "outputOptions": this.outputOptions
        }
    }
}