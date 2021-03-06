import * as dgram from "dgram";
import { EventEmitter } from "events";
import { Convert } from "pvtsutils";
import { AsymmetricRatchet, Identity, MessageSignedProtocol, PreKeyBundleProtocol } from "../classes";
import { ADDRESS, CLIENT_PORT, SERVER_BUNDLE_PORT, SERVER_PORT } from "./const";

export class Client extends EventEmitter {

    public static async create(id: number) {
        const client = new Client();

        const identity = await Identity.create(id, 1);
        client.identity = identity;
        client.socket = dgram.createSocket("udp4");

        client.socket
            .on("listening", () => {
                client.emit("listening", client.socket.address());
            })
            .on("error", (err) => {
                client.emit("error", err);
            })
            .on("message", (data, info) => {
                const buf = new Uint8Array(data).buffer;
                if (info.port === SERVER_BUNDLE_PORT) {
                    client.onBundle(buf);
                } else {
                    client.onMessage(buf);
                }
            });
        client.socket.bind(CLIENT_PORT, ADDRESS);
        return client;
    }

    public identity: Identity;
    public cipher: AsymmetricRatchet;
    public socket: dgram.Socket;

    public on(event: string, listener: Function): this;
    public on(event: "close", listener: () => void): this;
    public on(event: "connected", listener: () => void): this;
    public on(event: "error", listener: (err: Error) => void): this;
    public on(event: "message", listener: (text: string) => void): this;
    public on(event: "listening", listener: (address: dgram.AddressInfo) => void): this;
    public on(event: string, listener: Function) {
        return super.on(event, listener);
    }

    public once(event: string, listener: Function): this;
    public once(event: "close", listener: () => void): this;
    public once(event: "error", listener: (err: Error) => void): this;
    public once(event: "message", listener: (text: string) => void): this;
    public once(event: "listening", listener: (address: dgram.AddressInfo) => void): this;
    public once(event: string, listener: Function) {
        return super.once(event, listener);
    }

    public connect() {
        this.socket.send("", SERVER_BUNDLE_PORT, ADDRESS);
    }

    public async send(text: string) {
        const protocol = await this.cipher.encrypt(Convert.FromUtf8String(text));
        const buf = await protocol.exportProto();
        this.socket.send(new Buffer(buf), SERVER_PORT, ADDRESS);
    }

    protected async onBundle(data: ArrayBuffer) {
        const protocol = await PreKeyBundleProtocol.importProto(data);
        this.cipher = await AsymmetricRatchet.create(this.identity, protocol);
        this.emit("connected");
    }

    protected async onMessage(data: ArrayBuffer) {
        const protocol = await MessageSignedProtocol.importProto(data);
        const text = await this.cipher.decrypt(protocol);
        this.emit("message", new Buffer(text).toString());
    }

}
