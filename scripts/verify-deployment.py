#!/usr/bin/env python3
"""Read-only bytecode/IDL identity check. This is not source verification or an audit."""
import base64, hashlib, json, pathlib, sys, urllib.request
root = pathlib.Path(__file__).resolve().parents[1]
release = json.loads((root / 'release.json').read_text())
def rpc(method, params):
    req = urllib.request.Request('https://api.mainnet-beta.solana.com', data=json.dumps({'jsonrpc':'2.0','id':1,'method':method,'params':params}).encode(), headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req, timeout=20) as response:
        result = json.load(response)
    if 'error' in result: raise RuntimeError('RPC rejected verification request')
    return result['result']
def b58(data):
    alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    value, result = int.from_bytes(data, 'big'), ''
    while value:
        value, digit = divmod(value, 58)
        result = alphabet[digit] + result
    return '1' * (len(data) - len(data.lstrip(b'\0'))) + result
def account(key):
    return rpc('getAccountInfo',[key,{'encoding':'base64','commitment':'finalized'}])['value']
def verify():
    if rpc('getGenesisHash',[]) != release['genesisHash']: raise RuntimeError('Wrong network')
    if hashlib.sha256((root/'idl/basket.json').read_bytes()).hexdigest()!=release['idlSha256']: raise RuntimeError('Local IDL hash mismatch')
    p = account(release['program'])
    if p is None:
        print('NOT DEPLOYED: candidate only; do not enable trading.'); return 2
    loader = 'BPFLoaderUpgradeab1e11111111111111111111111'
    if not p['executable'] or p['owner'] != loader: raise RuntimeError('Unexpected executable/loader')
    data = base64.b64decode(p['data'][0], validate=True)
    if len(data)!=36 or int.from_bytes(data[:4],'little')!=2: raise RuntimeError('Invalid program account')
    d = account(b58(data[4:])); raw = base64.b64decode(d['data'][0], validate=True)
    if d['owner']!=loader or int.from_bytes(raw[:4],'little')!=3: raise RuntimeError('Invalid ProgramData')
    if len(raw)!=45+release['programBytes'] or hashlib.sha256(raw[45:]).hexdigest()!=release['programSha256']: raise RuntimeError('Deployed binary mismatch')
    print(json.dumps({'binaryMatches':True,'program':release['program'],'deploymentSlot':int.from_bytes(raw[4:12],'little'),'upgradeAuthority':b58(raw[13:45]) if raw[12]==1 else None,'sourceVerified':False,'independentAudit':False},indent=2))
    return 0
if __name__ == '__main__':
    try: sys.exit(verify())
    except Exception as error:
        print('Verification failed:',error,file=sys.stderr);sys.exit(1)
