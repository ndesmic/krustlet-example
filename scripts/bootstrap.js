import {
	parse,
	stringify,
} from "https://deno.land/std/encoding/yaml.ts";

function generateToken(){
	const arr = new Uint8Array(24);
	crypto.getRandomValues(arr);
	const values = Array.from(arr)
		.map(x => x % 36)
		.map(x => 
			x < 10 
				? x + 48
				: (x - 10) + 97)
		.map(x => String.fromCharCode(x))
		.join("");
	return `${values.slice(0, 5)}.${values.slice(6)}`;
}

async function run(cmd, input, env = {}){
	const process = Deno.run({
		stdout: "piped",
		stdin: "piped",
		cmd,
		env
	});
	if(input){
		process.stdin.write(new TextEncoder().encode(input));
	}
	return new TextDecoder().decode(await process.output());
}

const tokenId = generateToken();
const tokenSecret = generateToken();
const expiration = new Date(new Date().getTime() + 3_600_000);

const secretYaml = `
apiVersion: v1
kind: Secret
metadata:
  name: bootstrap-token-<token_id>
  namespace: kube-system
type: bootstrap.kubernetes.io/token
stringData:
  auth-extra-groups: system:bootstrappers:kubeadm:default-node-token
  expiration: ${expiration.toISOString()}
  token-id: ${tokenId}
  token-secret: ${tokenSecret}
  usage-bootstrap-authentication: "true"
  usage-bootstrap-signing: "true"
`;

console.log(await run(["kubectl", "apply", "-f", "-"], secretYaml));

console.log("!")

const kubeconfig = parse(await run(["kubectl", "config", "view", "--raw"]));

console.log(kubeconfig);