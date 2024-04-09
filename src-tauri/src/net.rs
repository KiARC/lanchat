use libp2p::{
    swarm::{ SwarmEvent, NetworkBehaviour },
    gossipsub,
    mdns,
    noise,
    tcp,
    yamux,
    SwarmBuilder,
    futures::StreamExt,
};
use tauri::{ Manager, Runtime, plugin::Plugin, Invoke, State, Window };
use tokio::sync::mpsc;
use std::{ hash::{ Hash, DefaultHasher, Hasher }, time::Duration };
use serde::{ Deserialize, Serialize };

#[derive(NetworkBehaviour)]
pub(crate) struct Behaviour {
    gossipsub: gossipsub::Behaviour,
    mdns: mdns::tokio::Behaviour,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq, Hash, Clone)]
pub(crate) struct Message {
    content: String,
    nickname: String,
    timestamp: i64,
}

#[derive(Debug)]
enum Command {
    SendMessage(Message),
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum Event {
    ReceivedMessage(Message),
}

/// Queue a SendMessage command for the network event handler
#[tauri::command]
async fn send(
    message: Message,
    sender: State<'_, tauri::async_runtime::Sender<Command>>
) -> Result<(), String> {
    sender.send(Command::SendMessage(message)).await.unwrap();
    Ok(())
}

pub struct TauriLanChat<R: Runtime> {
    invoke_handler: Box<dyn Fn(Invoke<R>) + Send + Sync>,
}

impl<R: Runtime> TauriLanChat<R> {
    pub fn new() -> Self {
        Self {
            invoke_handler: Box::new(tauri::generate_handler![send]),
        }
    }
}

impl<R: Runtime> Plugin<R> for TauriLanChat<R> {
    fn name(&self) -> &'static str {
        "lanchat"
    }

    fn extend_api(&mut self, invoke: Invoke<R>) {
        (self.invoke_handler)(invoke)
    }

    fn created(&mut self, window: Window<R>) {
        let (sender, mut receiver) = mpsc::channel::<Command>(100);
        window.manage(sender);
        tauri::async_runtime::spawn(async move {
            let mut swarm = SwarmBuilder::with_new_identity()
                .with_tokio()
                .with_tcp(tcp::Config::default(), noise::Config::new, yamux::Config::default)
                .unwrap()
                .with_quic()
                .with_behaviour(|key| {
                    let message_id_fn = |message: &gossipsub::Message| {
                        let mut s = DefaultHasher::new();
                        message.data.hash(&mut s);
                        gossipsub::MessageId::from(s.finish().to_string())
                    };
                    let gossipsub_config = gossipsub::ConfigBuilder
                        ::default()
                        .message_id_fn(message_id_fn) // Content addressing
                        .build()?;
                    let gossipsub = gossipsub::Behaviour::new(
                        gossipsub::MessageAuthenticity::Signed(key.clone()),
                        gossipsub_config
                    )?;
                    let mdns = mdns::tokio::Behaviour::new(
                        mdns::Config::default(),
                        key.public().to_peer_id()
                    )?;
                    Ok(Behaviour { gossipsub, mdns })
                })
                .unwrap()
                .with_swarm_config(|c| c.with_idle_connection_timeout(Duration::from_secs(60)))
                .build();

            let topic = gossipsub::IdentTopic::new("lanchat");
            swarm.behaviour_mut().gossipsub.subscribe(&topic).unwrap();
            swarm.listen_on("/ip4/0.0.0.0/tcp/0".parse().unwrap()).unwrap();
            swarm.listen_on("/ip4/0.0.0.0/udp/0/quic-v1".parse().unwrap()).unwrap();

            loop {
                tokio::select! {
                    Some(command) = receiver.recv() => {
                        match command {
                            Command::SendMessage(m) =>  {
                                println!("Sending message {:?}", m);
                                let msg = rmp_serde::to_vec(&m).unwrap();
                                swarm.behaviour_mut().gossipsub.publish(topic.clone(), msg).expect("Failed to publish message");
                            },
                        }
                    },
                    event = swarm.select_next_some() => match event { 
                        SwarmEvent::Behaviour(BehaviourEvent::Mdns(mdns::Event::Discovered(list))) => {
                            for (peer_id, multiaddr) in list {
                                println!("mDNS discovered a new peer: {peer_id} ({multiaddr})");
                                swarm.behaviour_mut().gossipsub.add_explicit_peer(&peer_id);
                            }
                        },
                        SwarmEvent::Behaviour(BehaviourEvent::Mdns(mdns::Event::Expired(list))) => {
                            for (peer_id, multiaddr) in list {
                                println!("mDNS peer has expired: {peer_id} ({multiaddr})");
                                swarm.behaviour_mut().gossipsub.remove_explicit_peer(&peer_id);
                            }
                        },
                        SwarmEvent::Behaviour(BehaviourEvent::Gossipsub(gossipsub::Event::Message {
                            propagation_source: peer_id,
                            message_id: id,
                            message,
                        })) => {
                            println!(
                                "Got message: '{:?}' with id: {id} from peer: {peer_id}",
                                message.data,
                            );
                            window.emit(&"plugin:lanchat|receivedMessage", Event::ReceivedMessage(rmp_serde::from_slice(&message.data).unwrap())).unwrap();
                        },
                        SwarmEvent::NewListenAddr { address, .. } => {
                            println!("Listening on {address}");
                        }
                        _ => {}
                    },
                }
            }
        });
    }
}
