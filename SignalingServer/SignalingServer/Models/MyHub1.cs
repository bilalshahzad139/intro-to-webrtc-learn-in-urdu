using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.AspNet.SignalR;
using System.Collections.Concurrent;
using Microsoft.AspNet.SignalR.Hubs;
using System.Threading.Tasks;

namespace WebApplication5.Models
{
    public class UserConnectionData
    {
        public String connectionId { get; set; }
        public String user_id { get; set; }
        public string meeting_id { get; set; }
    }
    public class WebRtcHub : Hub
    {
        public static List<UserConnectionData> _userConnections = new List<UserConnectionData>();

        public Object Connect(String dsiplayName, String meetingid)
        {
            
            _userConnections.Add(new UserConnectionData()
            {
                meeting_id = meetingid,
                user_id = dsiplayName,
                connectionId = Context.ConnectionId
            });

            var other_users = _userConnections.Where(p => p.meeting_id == meetingid && p.connectionId != Context.ConnectionId).ToList();
            foreach (var v in other_users)
            {
                Clients.Client(v.connectionId).informAboutNewConnection(dsiplayName, Context.ConnectionId);
            }

            return other_users;
            //var users = list.Select(p => p.user_id).ToList();
            //foreach (var v in list)
            //{
            //    Clients.Client(v.connectionId).informAboutUsers(users);
            //}
        }
        public override Task OnDisconnected(bool stopCalled)
        {
            var connectionId = Context.ConnectionId;
            var meeting_id = _userConnections.Where(p => p.connectionId == connectionId).Select(p => p.meeting_id).FirstOrDefault();

            _userConnections.RemoveAll(p => p.connectionId == connectionId);
            var list = _userConnections.Where(p => p.meeting_id == meeting_id).ToList();
            
            foreach (var v in list)
            {
                Clients.Client(v.connectionId).informAboutConnectionEnd(connectionId);
            }

            return base.OnDisconnected(stopCalled);
        }
        public void ExchangeSDP(string message, String to_connid)
        {
            var from_connId = Context.ConnectionId;
            Clients.Client(to_connid).exchangeSDP(message, from_connId);
        }

        public void reset()
        {
            var connectionId = Context.ConnectionId;
            var meetingid = _userConnections.Where(p => p.connectionId == connectionId).Select(p => p.meeting_id).FirstOrDefault();

            var list = _userConnections.Where(p => p.meeting_id == meetingid).ToList();
            _userConnections.RemoveAll(p => p.meeting_id == meetingid);
            
            foreach(var v in list)
            {
                Clients.Client(v.connectionId).reset();
            }
        }

        public void sendMessage(string message)
        {
            var connectionId = Context.ConnectionId;
            var obj = _userConnections.Where(p => p.connectionId == connectionId).FirstOrDefault();
            var meetingid = obj.meeting_id;
            var from = obj.user_id;

            var list = _userConnections.Where(p => p.meeting_id == meetingid).ToList();

            foreach (var v in list)
            {   
                Clients.Client(v.connectionId).showChatMessage(from, message, DateTime.Now.ToString("MM/dd/yyyy hh:mm tt"));
            }

        }
    }
}