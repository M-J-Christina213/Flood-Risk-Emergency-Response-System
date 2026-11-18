import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { mobileRequest, signIn, signOut, syncOfflineReports } from '@/services/api';

export default function AccountPanel() {
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [station,setStation]=useState('Hanwella');
  const [token,setToken]=useState('');
  const [role,setRole]=useState('');
  const [message,setMessage]=useState('Sign in for subscriptions and acknowledgements.');
  const [deliveries,setDeliveries]=useState<any[]>([]);
  const [busy,setBusy]=useState(false);
  async function run(work:()=>Promise<void>) {
    setBusy(true);
    try { await work();setMessage('Updated.'); }
    catch(e) { setMessage(e instanceof Error?e.message:'Connection failed'); }
    finally { setBusy(false); }
  }
  return <View style={{padding:16,gap:12}}>
    <Text style={{fontSize:20,fontWeight:'bold'}}>Prototype account and notifications</Text>
    <Text>Session stays in memory. Sign in again after restarting the app.</Text>
    <TextInput accessibilityLabel="Username" autoCapitalize="none" placeholder="Username" value={username} onChangeText={setUsername} style={{borderWidth:1,padding:10}}/>
    <TextInput accessibilityLabel="Password" secureTextEntry placeholder="Password (10+ characters)" value={password} onChangeText={setPassword} style={{borderWidth:1,padding:10}}/>
    <Button title="Sign in" disabled={busy} onPress={()=>run(async()=>{const user=await signIn(username,password);setRole(user.role);setPassword('');})}/>
    <Button title="Register public account" disabled={busy} onPress={()=>run(async()=>{await mobileRequest('/auth/register',{method:'POST',body:{username,password}});})}/>
    <Text accessibilityRole="alert">{message} {role}</Text>
    <TextInput accessibilityLabel="Subscription station" placeholder="Station" value={station} onChangeText={setStation} style={{borderWidth:1,padding:10}}/>
    <Button title="Subscribe to station web inbox" disabled={busy} onPress={()=>run(async()=>{await mobileRequest('/subscriptions',{method:'POST',body:{station}});})}/>
    <TextInput accessibilityLabel="Expo push token" placeholder="Expo token from configured development build" value={token} onChangeText={setToken} style={{borderWidth:1,padding:10}}/>
    <Button title="Register existing Expo token" disabled={busy||!token} onPress={()=>run(async()=>{await mobileRequest('/subscriptions',{method:'POST',body:{station,channel:'expo',destination:token}});})}/>
    <Text>Native push-token acquisition requires a configured development build and device testing. Test adapter records attempts; it does not deliver notifications.</Text>
    <Button title="Refresh my inbox" disabled={busy} onPress={()=>run(async()=>{setDeliveries((await mobileRequest('/inbox')).deliveries);})}/>
    {!deliveries.length && <Text>No deliveries loaded.</Text>}
    {deliveries.map(d=><View key={d._id} style={{borderWidth:1,padding:10}}><Text>{d.alert_id}: {d.state}</Text><Text>{d.last_error}</Text><Button title="Acknowledge" disabled={busy} onPress={()=>run(async()=>{await mobileRequest(`/alerts/${d.alert_id}/acknowledge`,{method:'POST'});})}/></View>)}
    <Button title="Retry reports saved on this device" disabled={busy} onPress={()=>run(async()=>{await syncOfflineReports();})}/>
    <Button title="Sign out" disabled={busy} onPress={()=>run(async()=>{await signOut();setRole('');setDeliveries([]);})}/>
  </View>;
}
